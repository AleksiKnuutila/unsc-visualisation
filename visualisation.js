var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width-50], .1);

var y = d3.scale.linear()
    .rangeRound([height, 0]);

// var color = d3.scale.ordinal()
//     .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
var color = d3.scale.ordinal()
    .range(['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928','#BBBBBB','#000000']);
var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

var svg;

var active_link = "0"; //to control legend selections and hover
var legendClicked; //to control legend selections
var legendClassArray = []; //store legend classes to select bars in plotSingle()
var legendClassArray_orig = []; //orig (with spaces)
var sortDescending; //if true, bars are sorted by height in descending order
var restoreXFlag = false; //restore order of bars back to original

// find range of years in data
var get_years = function(data) {
  years = data.map(function(x) { return x['Year']; });
  unique_years = years.filter(function(item, i, ar){ return ar.indexOf(item) === i; });
  return unique_years.sort();
}

var country_is_selected = function(country, selected_countries) {
  // if no selection, let's display all
  if(! selected_countries || selected_countries.length === 0) {
    return true;
  } else {
    for(i=0;i<selected_countries.length;i++){
      if(country == selected_countries[i]) {
        return true;
      }
      if(area_is_part_of(country, selected_countries[i])) { return true; }
    }
  }
  return false;
}

var area_is_part_of = function(area1, area2) {
  // check if country in question is contained by one of the selected areas
  ca = children_array(area2);
  if(ca && ca.length > 0) {
    for(j=0;j<ca.length;j++){
      if(area1 == ca[j]) { return true; }
    }
  }
  return false;
}

var get_type_count = function(data, year, type, selected_countries) {
  return data.reduce(function(total, element) {
    if (element['Year'] == year && element[type] == 1 && country_is_selected(element.Country, selected_countries)) {
      return total + parseInt(element[type]);
    } else {
      return total;
    }
  }, 0);
}

// var get_resolution_count = function
var get_area_count = function(data, year, area) {
  return data.reduce(function(total, element) {
//    if (element['Year'] == year && element[type] == 1 && country_is_selected(element.Country, selected_countries)) {
    if (element['Year'] == year && (element.Country == area || area_is_part_of(element.Country, area))) {
//      return total + parseInt(element[type]);
      return total + 1;
    } else {
      return total;
    }
  }, 0);
}

var types = ['AS','AT','CC','DT','FC','GT','HS','HT','KN','PI','RT','TE','TR','WT'];
var aggregate_by_type = function aggregate_by_type(data, selected_countries) {
  years = get_years(data);
  aggregated_data = {};
  years.forEach(function(year) {
    aggregated_data[year] = {};
    types.forEach(function(type) {
      aggregated_data[year][type] = get_type_count(data, year, type, selected_countries);
    });
  });
  return aggregated_data;
}

var top_regions = ["Africa", "Asia", "Central America", "Europe", "Middle East", "North America", "South America", "Global"];
var aggregate_by_country = function(data, selected_countries) {
  years = get_years(data);
  aggregated_data = {};
  years.forEach(function(year) {
    aggregated_data[year] = {};
    if(!selected_countries) { countries = top_regions; } else { countries = selected_countries; }
    countries.forEach(function(country) {
      aggregated_data[year][country] = get_area_count(data, year, country);
    });
  });
  return aggregated_data;
}

var split_by;
var units;

//disable sort checkbox
d3.select("label")
  .select("input")
  .property("disabled", true)
  .property("checked", false);

var update_data = function update_data(selected_countries) {

  split_by = glob_split_by;
  units = glob_units;

  if(split_by == 'countries') {
    agg_data = aggregate_by_country(glob_data, selected_countries);
    legend = selected_countries;
  } else {
    agg_data = aggregate_by_type(glob_data, selected_countries);
    legend = types;
  }

  // change data into form that can be easily used
  years.forEach(function(year) {
    var y0 = 0;
    agg_data[year].resolutions = legend.map(function(type) {
      return {
        year:year,
        type:type,
        y0: y0,
        y1: y0 += +agg_data[year][type],
        value:agg_data[year][type],
        y_corrected: 0
      };
    });
    agg_data[year].total = agg_data[year].resolutions[agg_data[year].resolutions.length - 1].y1;
  });

  total_vals = years.map(function(y) { return agg_data[y].total });
  y.domain([0, d3.max(total_vals)]);
  svg.transition()
    .duration(750)
    .select(".y.axis")
    .call(yAxis)
    .selectAll("g");

  plot_year.data(years.map(function (y) { return agg_data[y] }))
      .attr("class", "g")
      .attr("transform", function(d) { return "translate(" + "0" + ",0)"; });

   height_diff = 0;  //height discrepancy when calculating h based on data vs y(d.y0) - y(d.y1)
   rects = plot_year.selectAll("rect")
    .data(function(d) {
      return d.resolutions;
    })

   //   update here?
   rects
    .transition()
    .duration(750)
    .attr("width", x.rangeBand()) //restore bar width
    .style("opacity", 1)
      .attr("y", function(d) {
        height_diff = height_diff + y(d.y0) - y(d.y1) - (y(0) - y(d.value));
        y_corrected = y(d.y1) + height_diff;
        d.y_corrected = y_corrected //store in d for later use in restorePlot()
        //xx if (d.type === types[types.length-1]) height_diff = 0; //reset for next year
        if (d.type === legend[legend.length-1]) height_diff = 0; //reset for next year
        return y_corrected;
        // return y(d.y1);  //orig, but not accurate
      })
      .attr("x",function(d) { //add to stock code
          return x(d.year)
        })
      .attr("height", function(d) {
        //return y(d.y0) - y(d.y1); //heights calculated based on stacked values (inaccurate)
        return y(0) - y(d.value); //calculate height directly from value in csv file
      })
      .attr("class", function(d) {
        classLabel = d.type.replace(/\s/g, ''); //remove spaces
        return "bars class" + classLabel;
      })
      .style("fill", function(d) { return color(d.type); });

   rects
    .exit()
    .transition()
    .duration(750)
    .attr("width", 0) // use because svg has no zindex to hide bars so can't select visible bar underneath
    .style("opacity", 0);

//   rects
//    .exit()
//    .transition()
//    .duration(750)
//    .remove();

   rects.enter()
    .append("rect")
      .attr("width", x.rangeBand())
      .attr("y", function(d) {
        height_diff = height_diff + y(d.y0) - y(d.y1) - (y(0) - y(d.value));
        y_corrected = y(d.y1) + height_diff;
        d.y_corrected = y_corrected //store in d for later use in restorePlot()
//        if (d.type === types[types.length-1]) height_diff = 0; //reset for next year
        if (d.type === legend[legend.length-1]) height_diff = 0; //reset for next year
        return y_corrected;
        // return y(d.y1);  //orig, but not accurate
      })
      .attr("x",function(d) { //add to stock code
          return x(d.year)
        })
      .attr("height", function(d) {
        //return y(d.y0) - y(d.y1); //heights calculated based on stacked values (inaccurate)
        return y(0) - y(d.value); //calculate height directly from value in csv file
      })
      .attr("class", function(d) {
        classLabel = d.type.replace(/\s/g, ''); //remove spaces
        return "bars class" + classLabel;
      })
      .style("fill", function(d) { return color(d.type); });


  plot_year.selectAll("rect")
       .on("mouseover", function(d){

          var delta = d.y1 - d.y0;
          var xPos = parseFloat(d3.select(this).attr("x"));
          var yPos = parseFloat(d3.select(this).attr("y"));
          var height = parseFloat(d3.select(this).attr("height"))

          d3.select(this).attr("stroke","blue").attr("stroke-width",0.8);

          svg.append("text")
          .attr("x",xPos)
          .attr("y",yPos +height/2)
          .attr("class","tooltip")
          .text(d.type +": "+ delta);

       })
       .on("mouseout",function(){
          svg.select(".tooltip").remove();
          d3.select(this).attr("stroke","pink").attr("stroke-width",0.2);

        })
}

var glob_areas = [];
var glob_data = [];
var plot_year;

queue()
	.defer(d3.csv, 'https://areas-aleksi.hashbase.io/areas.csv')
	.defer(d3.csv, 'https://areas-aleksi.hashbase.io/resolutions.csv')
	.await(make_chart);

//d3.csv('https://areas-aleksi.hashbase.io/resolutions.csv', function(error, data) {
//  if (error) throw error;
function make_chart(error, areas, resolutions, units, split_by) {

  if(glob_areas.length == 0) {
    glob_areas = areas;
    make_area_tree(areas);
  }

  svg = d3.select("#targetdiv").append("svg")
      .attr("id", "graph")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  if(!units) { units = 'resolutions'; }
  if(!split_by) { split_by = 'types'; }
  selected_countries = top_regions;

  glob_data = resolutions;
  data = resolutions;
  if(split_by == 'countries') {
    color.domain(top_regions);
    agg_data = aggregate_by_country(glob_data, selected_countries);
    legend = selected_countries;
  } else {
    color.domain(types);
    agg_data = aggregate_by_type(glob_data, selected_countries);
    legend = types;
  }

  years = get_years(data);
  //  color.domain(d3.keys(data[0]).filter(function(key) { return key !== "State"; }));
//  color.domain(types);

  // change data into form that can be easily used
  years.forEach(function(year) {
    var y0 = 0;
    agg_data[year].resolutions = legend.map(function(type) {
      return {
        year:year,
        type:type,
        y0: y0,
        y1: y0 += +agg_data[year][type],
        value:agg_data[year][type],
        y_corrected: 0
      };
    });
    agg_data[year].total = agg_data[year].resolutions[agg_data[year].resolutions.length - 1].y1;
  });

  x.domain(years);
  total_vals = years.map(function(y) { return agg_data[y].total });
  y.domain([0, d3.max(total_vals)]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end");
      //.text("Population");

  plot_year = svg.selectAll(".plot_year")
    .data(years.map(function (y) { return agg_data[y] }))
    .enter().append("g")
      .attr("class", "g")
      .attr("transform", function(d) { return "translate(" + "0" + ",0)"; });

   height_diff = 0;  //height discrepancy when calculating h based on data vs y(d.y0) - y(d.y1)
   plot_year.selectAll("rect")
      .data(function(d) {
        return d.resolutions;
      })
    .enter().append("rect")
      .attr("width", x.rangeBand())
      .attr("y", function(d) {
        height_diff = height_diff + y(d.y0) - y(d.y1) - (y(0) - y(d.value));
        y_corrected = y(d.y1) + height_diff;
        d.y_corrected = y_corrected //store in d for later use in restorePlot()

        if (d.type === legend[legend.length-1]) height_diff = 0; //reset for next year

        return y_corrected;
        // return y(d.y1);  //orig, but not accurate
      })
      .attr("x",function(d) { //add to stock code
          return x(d.year)
        })
      .attr("height", function(d) {
        //return y(d.y0) - y(d.y1); //heights calculated based on stacked values (inaccurate)
        return y(0) - y(d.value); //calculate height directly from value in csv file
      })
      .attr("class", function(d) {
        classLabel = d.type.replace(/\s/g, ''); //remove spaces
        return "bars class" + classLabel;
      })
      .style("fill", function(d) { return color(d.type); });

  plot_year.selectAll("rect")
       .on("mouseover", function(d){

          var delta = d.y1 - d.y0;
          var xPos = parseFloat(d3.select(this).attr("x"));
          var yPos = parseFloat(d3.select(this).attr("y"));
          var height = parseFloat(d3.select(this).attr("height"))

          d3.select(this).attr("stroke","blue").attr("stroke-width",0.8);

          svg.append("text")
          .attr("x",xPos)
          .attr("y",yPos +height/2)
          .attr("class","tooltip")
          .text(d.type +": "+ delta);

       })
       .on("mouseout",function(){
          svg.select(".tooltip").remove();
          d3.select(this).attr("stroke","pink").attr("stroke-width",0.2);

        })

  var legend = svg.selectAll(".legend")
      .data(color.domain().slice().reverse())
    .enter().append("g")
      .attr("class", function (d) {
        legendClassArray.push(d.replace(/\s/g, '')); //remove spaces
        legendClassArray_orig.push(d); //remove spaces
        return "legend";
      })
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  //reverse order to match order in which bars are stacked
  legendClassArray = legendClassArray.reverse();
  legendClassArray_orig = legendClassArray_orig.reverse();

  legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color)
      .attr("id", function (d, i) {
        return "id" + d.replace(/\s/g, '');
      })
      .on("mouseover",function(){

        if (active_link === "0") d3.select(this).style("cursor", "pointer");
        else {
          if (active_link.split("class").pop() === this.id.split("id").pop()) {
            d3.select(this).style("cursor", "pointer");
          } else d3.select(this).style("cursor", "auto");
        }
      })
      .on("click",function(d){

        if (active_link === "0") { //nothing selected, turn on this selection
          d3.select(this)
            .style("stroke", "black")
            .style("stroke-width", 2);

            active_link = this.id.split("id").pop();
            plotSingle(this);

            //gray out the others
            for (i = 0; i < legendClassArray.length; i++) {
              if (legendClassArray[i] != active_link) {
                d3.select("#id" + legendClassArray[i])
                  .style("opacity", 0.5);
              } else sortBy = i; //save index for sorting in change()
            }

            //enable sort checkbox
            d3.select("label").select("input").property("disabled", false)
            d3.select("label").style("color", "black")
            //sort the bars if checkbox is clicked
            d3.select("input").on("change", change);

        } else { //deactivate
          if (active_link === this.id.split("id").pop()) {//active square selected; turn it OFF
            d3.select(this)
              .style("stroke", "none");

            //restore remaining boxes to normal opacity
            for (i = 0; i < legendClassArray.length; i++) {
                d3.select("#id" + legendClassArray[i])
                  .style("opacity", 1);
            }

//            if (d3.select("label").select("input").property("checked")) {
//              restoreXFlag = true;
//            }

            //disable sort checkbox
            d3.select("label")
              .style("color", "#D8D8D8")
              .select("input")
              .property("disabled", true)
              .property("checked", false);


            //sort bars back to original positions if necessary
            //change();

            //y translate selected category bars back to original y posn
            restorePlot(d);

            active_link = "0"; //reset
          }

        } //end active_link check

      });

  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });

  // restore graph after a single selection
  function restorePlot(d) {
    //restore graph after a single selection
    d3.selectAll(".bars:not(.class" + class_keep + ")")
          .transition()
          .duration(1000)
          .delay(function() {
            if (restoreXFlag) return 3000;
            else return 750;
          })
          .attr("width", x.rangeBand()) //restore bar width
          .style("opacity", 1);

    //translate bars back up to original y-posn
    d3.selectAll(".class" + class_keep)
      .attr("x", function(d) { return x(d.year); })
      .transition()
      .duration(1000)
      .delay(function () {
        if (restoreXFlag) return 2000; //bars have to be restored to orig posn
        else return 0;
      })
      .attr("y", function(d) {
        //return y(d.y1); //not exactly correct since not based on raw data value
        return d.y_corrected;
      });

    //reset
    restoreXFlag = false;

  }
}

function switch_view(units, split_by) {
  // remove existing chart
  $("#graph").remove();
  //make_area_tree(glob_areas);
  glob_units = units;
  glob_split_by = split_by;
  make_chart('', glob_areas, glob_data, units, split_by);
}


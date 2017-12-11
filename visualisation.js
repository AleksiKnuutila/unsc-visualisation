var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width-125], .1);

var y = d3.scale.linear()
    .rangeRound([height, 0]);

var color = d3.scale.ordinal()
  .range(['#80b1d3', '#fb8072', '#b3de69', '#d2d6b0', '#bc80bd', '#fccde5', '#ccebc5', '#ffed6f', '#d9d9d9', '#71a285', '#8dd3c7', '#ffffb3', '#bebada', '#fdb462']);
var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format("d"));

var svg;

var active_link = "0"; //to control legend selections and hover
var legendClicked; //to control legend selections
var legendClassArray = []; //store legend classes to select bars in plotSingle()
var legendClassArray_orig = []; //orig (with spaces)
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
//      if(area_is_part_of(country, selected_countries[i]) || area_is_parent_of(country, selected_countries[i]) ) { return true; }
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

var area_is_parent_of = function(area1, area2) {
  // check if country in question is contained by one of the selected areas
  ca = children_array(area1);
  if(ca && ca.length > 0) {
    for(j=0;j<ca.length;j++){
      if(area2 == ca[j]) { return true; }
    }
  }
  return false;
}

var get_type_count = function(data, year, type, selected_countries) {
  return data.reduce(function(total, element) {
    if (element['Year'] == year && element[type] == 1 && country_is_selected(element.Area, selected_countries)) {
      return total + parseInt(element[type]);
    } else {
      return total;
    }
  }, 0);
}

// var get_resolution_count = function
var get_area_count = function(data, year, area, selected_types) {
  return data.reduce(function(total, element) {
    if (element['Year'] == year && (element.Area == area || area_is_part_of(element.Area, area))) {
      for(i=0;i<selected_types.length;i++){
        if(element[selected_types[i]] > 0) { return total + 1; }
      }
      return total;
    } else {
      return total;
    }
  }, 0);
}

var types = ['AS','AT','CC','DT','FC','GT','HS','HT','KN','PI','RT','TE','TR','WT'];
var aggregate_by_type = function aggregate_by_type(data, selected_countries, selected_types) {
  years = get_years(data);
  aggregated_data = {};
  years.forEach(function(year) {
    aggregated_data[year] = {};
    selected_types.forEach(function(type) {
      aggregated_data[year][type] = get_type_count(data, year, type, selected_countries);
    });
  });
  return aggregated_data;
}

var top_regions = ["Africa", "Asia", "Central America", "Europe", "Middle East", "North America", "South America", "Global"];
var aggregate_by_country = function(data, selected_countries, selected_types) {
  years = get_years(data);
  aggregated_data = {};
  years.forEach(function(year) {
    aggregated_data[year] = {};
    if(!selected_countries) { countries = top_regions; } else { countries = selected_countries; }
    countries.forEach(function(country) {
      aggregated_data[year][country] = get_area_count(data, year, country, selected_types);
    });
  });
  return aggregated_data;
}

// default view when loading page
var glob_split_by = 'countries';
var glob_units = 'resolutions';

//disable sort checkbox
d3.select("label")
  .select("input")
  .property("disabled", true)
  .property("checked", false);

var update_data = function update_data(selected_countries, selected_types) {

  country_is_selected("Israel & Palestine",["Israel"]);

  split_by = glob_split_by;
  units = glob_units;

  if(selected_countries.length == 0) { selected_countries = top_regions; }
  if(selected_types.length == 0) { selected_types = types; }

  if(split_by == 'countries') {
    agg_data = aggregate_by_country(glob_data, selected_countries, selected_types);
    legend = selected_countries;
  } else {
    agg_data = aggregate_by_type(glob_data, selected_countries, selected_types);
    legend = selected_types;
  }

  legend_total = {};
  legend.forEach(function(t) {
    legend_total[t] = 0;
    years.forEach(function(year) {
      legend_total[t] += agg_data[year][t];
    });
  });
  legend.sort(function(a, b) { return legend_total[b] - legend_total[a]; });
  color.domain(legend);

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

      $(".legend").remove()
      create_legend();

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

//queue()
//	.defer(d3.csv, 'https://areas-aleksi.hashbase.io/areas.csv')
//	.defer(d3.csv, 'https://areas-aleksi.hashbase.io/resolutions.csv')
//	.await(make_chart);

var publicSpreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1SyjZImXYewbyYDrybBiQ6039_xrfAsxqDFuOd6OG2_k/edit?usp=sharing';

var load_sheet_data = function(data, tabletop) {
  $("#loader").fadeOut(400);
  $("#loadedcontent").fadeIn(400);
  glob_data = tabletop.sheets('Cleaned Data').elements;
  areas = tabletop.sheets('Areas').elements;
  make_chart(areas, glob_data);
}

var type_code_to_legend = function(type) {
  dict = {
    'HT': 'Human Trafficking',
    'HS': 'Human Smuggling',
    'DT': 'Drugs Trafficking',
    'AS': 'Arms Smuggling',
    'AT': 'Arms Trafficking',
    'RT': 'Resource Trafficking',
    'WT': 'Wildlife Trafficking',
    'TR': 'Theft Armed Robbery',
    'PI': 'Piracy',
    'GT': 'Goods Trafficking',
    'FC': 'Financial Crime',
    'CC': 'Cyber Crime',
    'TE': 'Terrorism',
    'KN': 'Kidnapping Abductions',
  }
  if(type in dict) {
    return dict[type];
  } else {
    return type;
  }
}

function make_chart(areas, resolutions, units, split_by) {

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
  if(!split_by) { split_by = 'countries'; }
  selected_countries = get_selected_countries();
  selected_types = get_selected_types();

  glob_data = resolutions;
  data = resolutions;
  if(split_by == 'countries') {
    agg_data = aggregate_by_country(glob_data, selected_countries, selected_types);
    legend = selected_countries;
  } else {
    agg_data = aggregate_by_type(glob_data, selected_countries, selected_types);
    legend = selected_types;
  }

  legend_total = {};
  legend.forEach(function(t) {
    legend_total[t] = 0;
    years.forEach(function(year) {
      legend_total[t] += agg_data[year][t];
    });
  });
  legend.sort(function(a, b) { return legend_total[b] - legend_total[a]; });
  color.domain(legend);

  years = get_years(data);
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

  if(split_by == 'countries') {
    var y_text = 'Resolutions';
  } else {
    var y_text = 'Mentions';
  }

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(y_text);

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

  create_legend();

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

var create_legend = function() {

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
      });

  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) {
        return type_code_to_legend(d);
      });

}

function switch_view(units, split_by) {
  // remove existing chart
  $("#graph").remove();
  //make_area_tree(glob_areas);
  glob_units = units;
  glob_split_by = split_by;
  make_chart(glob_areas, glob_data, units, split_by);
}


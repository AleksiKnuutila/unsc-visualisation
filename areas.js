function Node(data) {
  this.data = data;
  this.parent = null;
  this.children = [];
}

function Tree(data) {
  var node = new Node(data);
  this._root = node;
}

Tree.prototype.traverseDF = function(callback) {

  // this is a recurse and immediately-invoking function
  (function recurse(currentNode) {
    // step 2
    for (var i = 0, length = currentNode.children.length; i < length; i++) {
      // step 3
      recurse(currentNode.children[i]);
    }

    // step 4
    callback(currentNode);

    // step 1
  })(this._root);

};

Tree.prototype.traverse_with_depth = function(callback, depth) {

  // this is a recurse and immediately-invoking function
  (function recurse(currentNode, depth) {
    // step 2
    callback(currentNode, depth);

    // step 2
    for (var i = 0, length = currentNode.children.length; i < length; i++) {
      // step 3
      recurse(currentNode.children[i], depth+1);
    }

    // step 1
  })(this._root, depth);

};


// necessary?
function Queue() {
    this._oldestIndex = 1;
    this._newestIndex = 1;
    this._storage = {};
}

Queue.prototype.enqueue = function(data) {
    this._storage[this._newestIndex] = data;
    this._newestIndex++;
};

Queue.prototype.dequeue = function() {
    var oldestIndex = this._oldestIndex,
        deletedData = this._storage[oldestIndex];

    delete this._storage[oldestIndex];
    this._oldestIndex++;

    return deletedData;
};

Tree.prototype.traverseBF = function(callback) {
  var queue = new Queue();

  queue.enqueue(this._root);

  currentTree = queue.dequeue();

  while(currentTree){
    for (var i = 0, length = currentTree.children.length; i < length; i++) {
      queue.enqueue(currentTree.children[i]);
    }

    callback(currentTree);
    currentTree = queue.dequeue();
  }
};

Tree.prototype.contains = function(callback, traversal) {
  traversal.call(this, callback);
};

Tree.prototype.find = function(data) {
  var result;
  callback = function(node) {
    if (node.data === data) {
      result = node;
    }
  };

  this.contains(callback, Tree.prototype.traverseDF);
  return result;
}

//Tree.prototype.add = function(data, toData, traversal) {
Tree.prototype.add = function(data, toData) {
  var child = new Node(data),
  parent = null,
  callback = function(node) {
    if (node.data === toData) {
      parent = node;
    }
  };

//  this.contains(callback, traversal);
  this.contains(callback, Tree.prototype.traverseDF);

  if (parent) {
    parent.children.push(child);
    child.parent = parent;
  } else {
    throw new Error('Cannot add node to a non-existent parent.');
  }
};

Tree.prototype.remove = function(data, fromData, traversal) {
  var tree = this,
  parent = null,
  childToRemove = null,
  index;

  var callback = function(node) {
    if (node.data === fromData) {
      parent = node;
    }
  };

  this.contains(callback, traversal);

  if (parent) {
    index = findIndex(parent.children, data);

    if (index === undefined) {
      throw new Error('Node to remove does not exist.');
    } else {
      childToRemove = parent.children.splice(index, 1);
    }
  } else {
    throw new Error('Parent does not exist.');
  }

  return childToRemove;
};

function findIndex(arr, data) {
  var index;

  for (var i = 0; i < arr.length; i++) {
    if (arr[i].data === data) {
      index = i;
    }
  }

  return index;
}

function children_array(node) {
  var children = [];
  var parent = global_tree.find(node);
  parent.children.forEach(function (c) {
    children.push(c.data);
    if(c.children.length > 0) {
      c2 = children_array(c.data);
      c2.forEach(function (d) { children.push(d) });
    }
  });
  return children;
}

function print_tree(node, depth) {
//  console.log(node.data)

  var depth_string = '';
  for(i=0;i<depth;i++) {
    depth_string = depth_string + '--'
  }

  if (node.children.length > 0) {
    console.log(depth_string + ' ' + node.data + " contains " + node.children.length + " areas");
  } else {
    console.log(depth_string + ' ' + node.data)
  }
}

var global_tree;

d3.csv('https://areas-aleksi.hashbase.io/areas.csv', function(error, data) {
  if (error) throw error;

  // root node
  global_tree = new Tree('World');

  // These are the areas immediately under World, which are hardcoded as we assume they won't change
  // Global is add as an area separate of other areas (does not contain other areas)
  top_areas = [ 'Africa', 'Asia', 'Central America', 'Europe', 'Middle East', 'North America', 'South America', 'Global' ];
  top_areas.forEach(function (a) { global_tree.add(a, 'World') });

  data.forEach(function(e) {
    global_tree.add(e['This'],e['Is Inside This']);
  });


  top_areas.forEach(function (a) {
    optgroup = $('select optgroup[label="'+a+'"]')
    children = children_array(a);
    children.forEach(function (c) {
      optgroup.append('<option value="'+c+'">'+c+'</option>');
    });
  });

  /*
    <select multiple='multiple' style="width:200px" id='target'>
        <optgroup label="Africa">
            <option value='Afghanistan'>Afghanistan</option>
            <option value='Sudan'>Sudan</option>
			<option value='9'>Bed Stuy</option>
        </optgroup>
        <optgroup label="All Manhattan">
            <option value='3'>Flatiron</option>
            <option value='4'>Upper West Side</option>
			<option value='10'>Manhattanville</option>
        </optgroup>
        <optgroup label="All Queens">
            <option value='5'>Long Island City</option>
            <option value='6'>Astoria</option>
        </optgroup>
    </select>
	<script>
   */

  var divtarget = d3.select('#divtarget')

  divtarget.append('select')
    .selectAll('optgroup')
      .data()
      .enter()
    .append('optgroup')
      .attr('label',function (d) { return d.key})
    .selectAll('option')
      .data(function (d) { return d.value })
      .enter()
    .append('option')
      .attr('value',function (d) { return d })
      .text(function (d) { return d })


});

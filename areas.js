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

  if(!depth) { depth = 0; }

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

function print_tree(node, depth) {

  var depth_string = '--';
  for(i=0;i<depth;i++) {
    depth_string = depth_string + '--';
  }

  if (node.children.length > 0) {
    console.log(depth_string + ' ' + node.data + " contains " + node.children.length + " areas");
  } else {
    console.log(depth_string + ' ' + node.data);
  }
}


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
    parent.children = parent.children.sort(function(a, b){
      if(a.data < b.data) return -1;
      if(a.data > b.data) return 1;
      return 0;
    });
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

function immediate_children(node) {
  var children = [];
  var parent = global_tree.find(node);
  parent.children.forEach(function (c) {
      children.push(c.data);
  });
  return children;
}

var show_in_menu = function(region, data) {
  for(i=0;i<data.length;i++){
    if(data[i].Area == region && data[i]['Show in menu?'] == 'FALSE') {
      return false;
    }
  }
  return true;
}

var global_tree;

var add_options = function(node, depth) {
//    var optgroup = $('<optgroup label="'+a+'"></optgroup>"');
  if(depth == 0) { return true; }
  target = $('#target');
  name = node.data;
  if(show_in_menu(name, global_data)) {
    if(!added_areas.includes(name)) {
      var optgroup = $('<option class="region_l'+depth+'" value="'+name+'">'+name+'</option>"');
      target.append(optgroup);
      added_areas.push(name);
    }
  }
}

var global_data;
var make_area_tree = function(data) {

  // root node
  global_tree = new Tree('All');
  global_data = data;

  data.forEach(function(e) {
    global_tree.add(e['Area'],e['Is Inside This Area']);
  });

  top_areas = immediate_children('All');
  target= $('#target');

  added_areas = [];
  global_tree.contains(add_options, Tree.prototype.traverse_with_depth);
  global = $('select optgroup[label="Global"]');
  if(global) {
    global.append('<option value="Global">Global resolutions</option>');
  }
}

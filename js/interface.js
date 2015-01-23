/* interface.js
* Interface for a user-controlled plotting window
*
* Author: Stefan Hammer <jango@tbi.univie.ac.at>
* Version: 0.1
* Date: 2014-10-15
*/

$(window).resize(function() {
 setPlottingArea();
});

setPlottingArea = function() {
  var chartheight = $(window).height();
  if (!document.fullscreenElement &&    // alternative standard method
    !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {
    chartheight = chartheight-2;
  }
  
  $("#plotting-area").height(chartheight);
  var chartwidth = $("#chart").width();
  $("#plotting-area").width(chartwidth);
};

// thanks to https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Using_full_screen_mode
function toggleFullScreen(id) {
  var elem = document.getElementById(id);
  
  if (!document.fullscreenElement &&    // alternative standard method
      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    exitFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

// custom ajax call
ajax = function(uri, method, data) {
  var request = {
    url: uri,
    type: method,
    contentType: "application/json",
    accepts: "application/json",
    cache: false,
    dataType: 'json',
    data: data,
    error: function(jqXHR) {
        console.log("ajax error " + jqXHR.status + jqXHR.responseText);
    }
  };
  return $.ajax(request);
};

// initialize bootstrap tooltips
$("[data-toggle=tooltip]").tooltip();

  var self = this;
  
  self.input = ko.observable('1 3 5 7 11 13 17 19 23 27')
   
  self.newDatas = ko.observableArray([]);
  self.inputError = ko.observable('');
  self.submitted = ko.observable(false);
  self.inputFile = ko.observable(null);

  self.newInputError = function(message) {
    if (self.inputError() === '') {
      self.inputError(message);
    } else {
      self.inputError([self.inputError(), message].join("<br>"));
    }
    $('#Submit').button('reset');
  };
  
  self.uploadData = function (file) {
      self.inputFile(file);
      console.log(file);
  };
  
  self.loaded = ko.computed(function() {
    var returnValue = true;
    self.newMolecules().forEach(function(rna) {
      returnValue = (returnValue && rna.loaded());
    });
    returnValue = (returnValue && self.submitted());
    
    // here the code to hide modal and push the new molecules if everything is loaded correctly
    if((returnValue) && (self.inputError().length === 0)) {
      console.log("everything should be loaded now, updating graph!");
      $('#add').modal('hide');
      rnaView.graph.deaf = false;

      if (self.newMolecules().length > 0) {
          console.log('trying to add data');
          dataView.addData(self.newDatas());
          self.newData([]);
      }
    }
    return (returnValue);
  });

  self.cancelAddData = function() {
    $('#add').modal('hide');
    // reset the file upload form
    $('#inputFastaFile').val('');
    self.inputFile(null);
    // reset errors
    self.inputError('');
    rnaView.graph.deaf = false;
  };

  self.parseData = function(lines) {
      var data;
      var BreakException= {};
      
      try {
        var countErrors = 0;

        data = JSON.parse(lines);
      } catch(e) {
        if (e !== BreakException) throw e;
      }

      newDatas.push(data);

      self.submitted(true);
      $('#inputFastaFile').val('');
      self.inputFile(null);
  }
  
  self.submit = function() {
    self.submitted(false);
    $('#Submit').button('loading');
    self.inputError('');
    self.newDatas([]);
    
    //remove leading/trailing/inbeteen newlines and split in at the remaining ones
    var lines = [];
    
    if (self.inputFile() !== null) {
      var r = new FileReader();
      r.onload = function(e) {
        var content = e.target.result;
        console.log(content);
	    self.parseData(content);
      }
      r.readAsText(self.inputFile());
    } else {
      console.log(lines);
      if (lines.length == 0) { self.newInputError("Please insert at least some data or pick a file!"); return; }
      self.parseData(lines);
    }
  };
}

// Knockout view model for RNA
function DataViewModel() {
  var self = this;
  
  self.viz = new Visualization("#chart");
  self.datas = ko.observableArray([]);
  
  self.addDatas = function(array) {
    // before we add molecules we need to enable animation
    self.animation(true);
    
    self.datas().concat(array);
    // add a new molecule to the graph
    array.forEach( function(data) {
      console.log(rna.header());
      self.viz.addData(data);
    });
  };
  /*jshint multistr: true */
  
  self.colors = ko.observable('structure'); // the color scheme setting can be structure/sequence/pairprobabilities

  self.colors.subscribe(function(newValue) {

      if (self.graph === null) {
          console.log("graph is null, won't update the color");
    } else {
        if (newValue == 'custom') {
            console.log("Custom colors selected");
        }
        //console.log("self.graph:", self.graph.changeColorScheme);
        self.graph.changeColorScheme(newValue);
    }
  });
  
  self.showAdd = function() {
    $('#Submit').button('reset');
    $('#add').modal('show');
    self.graph.deaf = true;
  };

  self.clearGraph = function() {
    // delete all nodes
    self.datas([]);
    self.viz.clearData();
  };
  
  self.centerMolecules = function() {
    self.graph.center_view();
  };

  self.saveJSON = function() {
      var data = {"rnas": self.graph.rnas, "extraLinks": self.graph.extraLinks};
      console.log('data:', data);
      var data_string = JSON.stringify(data, function(key, value) {
          //remove circular references
          if (key == 'rna') {
              return;
          } else {
              return value;
          }

      }, "\t");

      var blob = new Blob([data_string], {type: "application/json"});
      saveAs(blob, 'molecule.json')
  };

  self.savePNG = function() {
    saveSvgAsPng(document.getElementById('plotting-area'), 'rna.png', 4);
  };
  
  self.saveSVG = function() {
    console.log("saving svg...");
    var svg = document.getElementById('plotting-area');

    //get svg source.
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svg);

    //add name spaces.
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    
    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    // use FileSave to get a downloadable SVG File
    var file = new Blob([source], {type: "data:image/svg+xml;charset=utf-8"});
    saveAs(file, "vis.svg");
  };
}

// bind the model to the ui
var dataView = new DataViewModel();
var addView = new AddViewModel();

ko.applyBindings(rnaView, document.getElementById('chart'));
ko.applyBindings(addView, document.getElementById('add'));


String.prototype.capitalize = function(){
  return this.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
};
      
      
(function($) {

  $(document).ready(function() {
    var proxyPrefix = '';
    var dataPath = './data/';
    var dataHolder = {};
  
  
    // Get data wrapper
    function getLocalData(name) {
      var useJSONP = false;
      var defers = [];
      
      name = (_.isArray(name)) ? name : [ name ];
      
      // If the data path is not relative, then use JSONP
      if (dataPath.indexOf('http') === 0) {
        useJSONP = true;
      }
      
      // Go through each file and add to defers
      _.each(name, function(d) {
        var defer;
        if (_.isUndefined(dataHolder[d])) {
          
          if (useJSONP) {
            defer = $.jsonp({
              url: proxyPrefix + encodeURI(dataPath + d + '.json')
            });
          }
          else {
            defer = $.getJSON(dataPath + d + '.json');
          }
          
          $.when(defer).done(function(data) {
            dataHolder[d] = data;
          });
          defers.push(defer);
        }
      });
      
      return $.when.apply($, defers);
    };
    
    // Get data
    getLocalData([
      'noaa-mi3-station-data-mn-trimmed',
      'broken_temperature_record_from_pbs-2012-mn'
    ]).done(processData);
    
    
    // Get live record temperature data
    function processData() {
      var stations = dataHolder['noaa-mi3-station-data-mn-trimmed'];
      var data = dataHolder['broken_temperature_record_from_pbs-2012-mn'];
    
      // Function to get coordinates
      function getStation(name, stations) {
        var j;
        for (j in stations) {
          if (stations[j].station_name == name) {
            return stations[j];
          }
        }
        return {};
      };
      
      // Sort by date
      data.sort(function(m1, p1) {
        var m = ('' + m1.record_date).toLowerCase();
        var p = ('' + p1.record_date).toLowerCase();

        if (m > p) return 1;
        if (m < p) return -1;
        return 0;
      });

      // Group by date
      var grouping = {};
      var maxIncrease = 0;
      var maxIncreaseData = {};
      for (var i in data) {
        if (data[i].record_date) {
          var thisDate = Date.parse(data[i].record_date);
          var previousDate = Date.parse(data[i].previous_record_date);
          if (typeof grouping[data[i].record_date] == 'undefined') {
            grouping[data[i].record_date] = {};
          }
          grouping[data[i].record_date].date = thisDate;
          grouping[data[i].record_date].date_formatted = thisDate.toString("MMM d");
          grouping[data[i].record_date].date_object = thisDate;
          
          // Add places
          var station = getStation(data[i].station_name, stations);
          var diff = ((data[i].record - data[i].previous_record) / data[i].previous_record) + 0.01;
          grouping[data[i].record_date].places = grouping[data[i].record_date].places || [];
          var place = {
            name: data[i].station_name.toLowerCase().capitalize().replace('Ap', 'Airport'),
            lat: station.lat,
            lon: station.lon,
            record: data[i].record,
            previous_record: data[i].previous_record,
            previous_record_date: previousDate,
            difference: diff,
            date: thisDate
          };
          grouping[data[i].record_date].places.push(place);
          
          // Check max increase
          if (diff > maxIncrease) {
            maxIncrease = diff;
            maxIncreaseData = place;
          }
        }
      }
      
      // Make map // "http://{s}.tiles.mapbox.com/v3/mapbox.mapbox-light/{z}/{x}/{y}.png"
      var tiles = new L.TileLayer("http://{s}.tiles.mapbox.com/v3/minnpost.map-wi88b700/{z}/{x}/{y}.png", {
        attribution: "Map imagery from <a href=http://mapbox.com'>Mapbox</a>", 
        subdomains: ["a", "b", "c", "d"],
        maxZoom: 8,
        minZoom: 4
      });
      
      var map = new L.Map('temperature-map', {
        center: new L.LatLng(46.479553, -93.98589980000002),
        zoom: 7,
        layers: [tiles]
      });
      
      // Create marker layers
      var circleOptions = {
        color: '#801019',
        fillColor: '#801019',
        fillOpacity: 0.7,
        stroke: false
      };
      
      // Template for popup
      var makeLayerData = function(group) {
        var output = '';
        output += '<h3>' + group.date_object.toString('MMM d, yyyy') + '</h3>';
        output += '<ul>';
        for (var t in group.places) {
          output += '<li>' + group.places[t].name + ': <br> <strong>' + group.places[t].record + ' &deg;F</strong> &nbsp;&nbsp;(' + group.places[t].previous_record + ' &deg;F in ' + group.places[t].previous_record_date.toString('yyyy') + ')</li>';
        }
        output += '</ul>';
        return output;
      }
      
      // Template for group
      var makePopup = function(place, date) {
        var output = '';
        output += '<div class="popup-heading">' + place.name + '</div>';
        output += '<div class="popup-date">Date: <strong>' + date.toString('MMM d, yyyy') + '</strong></div>';
        output += '<div class="popup-new-record">New record: <strong>' + place.record + ' &deg;F</strong></div>';
        output += '<div class="popup-previous-record">Previous record: <strong>' + place.previous_record + ' &deg;F</strong> on <strong>' + place.previous_record_date.toString('yyyy') + '</strong></div>';
        return output;
      }

      // Create layer sets
      var overlayMaps = {};
      var groupIndex = [];
      for (var g in grouping) {
        var layerGroup = new L.LayerGroup();
        groupIndex.push(g);
        
        // Make points
        for (var p in grouping[g].places) {
          var ratio = grouping[g].places[p].difference / maxIncrease;
          var radius = 10000 + (ratio * 30000);
          var circle = new L.Circle(new L.LatLng(grouping[g].places[p].lat, grouping[g].places[p].lon), radius, circleOptions);
          circle.bindPopup(makePopup(grouping[g].places[p], grouping[g].date_object));
          layerGroup.addLayer(circle);
        }
        
        map.addLayer(layerGroup);
        overlayMaps[grouping[g].date_formatted + ' (' + grouping[g].places.length + ')'] = layerGroup;
      }

      // Add switcher. 
      var dateIndex = groupIndex.length - 1;
      var layersControl = new L.Control.Layers(overlayMaps, {});
      map.addControl(layersControl);
      
      // DOM magic.
      $('.js-dependent').show();
      
      // Take over the layer control
      $('#temperature-map-layers').append(layersControl._form);
      $('#temperature-map .leaflet-control-layers').hide();
      $('.leaflet-control-layers-list label input').css('visibility', 'hidden');
      
      // Index layer with groups
      $('.leaflet-control-layers-list label').each(function(index, value) {
        $(this).data('tMapGroup', groupIndex[index]);
        $(this).find('input').prop('checked', false);
      });
      
      // Handle layer clicking
      $('.leaflet-control-layers-list label').click(function(e) {
        map.closePopup();
        $('.leaflet-control-layers-list label').removeClass('layer-selector-selected')
          .not(this).find('input').prop('checked', false);
        
        $(this).addClass('layer-selector-selected');
        $(this).find('input').prop('checked', true);
        
        // Update layer data
        $('.temperature-map-layer-data-container').html(makeLayerData(grouping[$(this).data('tMapGroup')]));
        dateIndex = $(this).index();
      });
      
      // Show latest entry
      $('.leaflet-control-layers-list label:last, .leaflet-control-layers-list label:last input').click();
      
      // Player (we start on the newest entry)
      var datePlayerNext = function() {
        dateIndex = (dateIndex >= groupIndex.length - 1) ? 0 : dateIndex + 1;
        if (dateIndex == groupIndex.length - 1) {
          timer.stop();
        }
        $('.leaflet-control-layers-list label:eq(' + (dateIndex) + ') input').click();
      };
      var datePlayerPrev = function() {
        dateIndex = (dateIndex <= 0) ? groupIndex.length -1 : dateIndex - 1;
        $('.leaflet-control-layers-list label:eq(' + (dateIndex) + ') input').click();
      };
      
      var timer = $.timer(datePlayerNext);
      timer.set({ time : 1500 });
      
      $('.player-pause').hide();
      $('.player-prev').click(function(e) {
        e.preventDefault();
        datePlayerPrev();
      });
      $('.player-play').click(function(e) {
        e.preventDefault();
        dateIndex = -1;
        timer.play(true);
        datePlayerNext();
        $('.player-pause').show();
        $(this).hide();
      });
      $('.player-pause').click(function(e) {
        e.preventDefault();
        timer.pause();
        $('.player-play').show();
        $(this).hide();
      });
      $('.player-stop').click(function(e) {
        e.preventDefault();
        timer.stop();
        $('.player-play').show();
        $('.player-pause').hide();
      });
      $('.player-next').click(function(e) {
        e.preventDefault();
        datePlayerNext();
      });
      
      // Aggregate stats
      $('#temperature-map-stats').html('So far, <strong>' + data.length + '</strong> temperature records at Minnesota\'s major airports have been broken in 2012.');
      //$('#temperature-map-stats').html('So far, <strong>' + data.length + '</strong> temperature records at Minnesota\'s major airports have been broken in 2012.  The largest record change happened at ' + maxIncreaseData.name + ' on ' + maxIncreaseData.date.toString('MMM d, yyyy') + ', when the old record of ' + maxIncreaseData.previous_record + ' &deg;F in ' + maxIncreaseData.previous_record_date.toString('yyyy') + ' increased by <strong>' + (maxIncreaseData.difference * 100 + 100).toFixed() + '%</strong> to ' + maxIncreaseData.record + ' &deg;F.');
    }
  });
})(jQuery);
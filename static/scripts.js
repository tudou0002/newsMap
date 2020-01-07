let map;

let markers = [];

// a reference to an "info window" in which we’ll ultimately display links to articles.
let info = new google.maps.InfoWindow();

$(document).ready(function() {

    // creating a styled map object
    // https://developers.google.com/maps/documentation/javascript/styling
    var styles = 
        [
            {
                "featureType": "poi",
                "elementType": "labels.text",
                "stylers": [
                  {
                    "visibility": "off"
                  }
                ]
              },
              {
                "featureType": "poi.business",
                "stylers": [
                  {
                    "visibility": "off"
                  }
                ]
              },
              {
                "featureType": "road",
                "stylers": [
                  {
                    "visibility": "off"
                  }
                ]
              },
              {
                "featureType": "road",
                "elementType": "labels.icon",
                "stylers": [
                  {
                    "visibility": "off"
                  }
                ]
              },
              {
                "featureType": "transit",
                "stylers": [
                  {
                    "visibility": "off"
                  }
                ]
              }  
        ];

    // Instantiate map
    map = new google.maps.Map($("#map-canvas").get(0), {
        center: {lat: 45.508, lng: -73.561}, // Montreal, Quebec
        disableDefaultUI: true,
        //mapTypeId: 'Styled Map',
        maxZoom: 14,
        panControl: true,
        styles: styles,
        zoom: 13,
        zoomControl: true
    });

    google.maps.event.addListenerOnce(map, "idle", configure);

})

// add a marker to the map
function addMarker(place)
{
  var marker = new google.maps.Marker({
    label: place.place_name + ", " + place.admin_code1,
    position: {lat:parseFloat(place.latitude), lng:parseFloat(place.longitude)},
    map: map,
    animation: google.maps.Animation.DROP,

  });

  marker.addListener('click', function() {
    showInfo(marker);
    var parameters = {
      geo: '02138'
    };
    $.getJSON("/articles", parameters)
      .done(function(data){
      var content = "<ul>";
      data.forEach(function(line){
        content += "<li><a href='" + line.link + "' target='_blank'>" + line.title + "</a></li>"
      });
      content += "</ul>";
      showInfo(marker, content);
    })
  })

  markers.push(marker);
}

// Configure application
function configure()
{
    // Update UI after map has been dragged
    google.maps.event.addListener(map, "dragend", function() {

        // If info window isn't open
        // http://stackoverflow.com/a/12410385
        if (!info.getMap || !info.getMap())
        {
            update();
        }
    });

    // Update UI after zoom level changes
    google.maps.event.addListener(map, "zoom_changed", function() {
        update();
    });

    // Configure typeahead
    $("#q").typeahead({
        highlight: false,
        minLength: 3
    },
    {
        display: function(suggestion) { return null; },
        limit: 10,
        source: search,
        templates: {
            suggestion: Handlebars.compile(
                "<div>" +
                "{{place_name}}, {{admin_name1}}" +
                "</div>"
            )
        }
    });

    // Re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function(eventObject, suggestion, name) {

        // Set map's center
        map.setCenter({lat: parseFloat(suggestion.latitude), lng: parseFloat(suggestion.longitude)});

        // Update UI
        update();
    });

    // Hide info window when text box has focus
    $("#q").focus(function(eventData) {
        info.close();
    });

    // Re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true;
        event.stopPropagation && event.stopPropagation();
        event.cancelBubble && event.cancelBubble();
    }, true);

    // Update UI
    update();

    // Give focus to text box
    $("#q").focus();
}

// remove markers from the map
function removeMarkers()
{
  for (let i = 0; i < markers.length; i++)
       {
           markers[i].setMap(null);
       }
  markers.length = 0;
}

// called when user changes the search box
function search(query, syncResults, asyncResults)
{
  // Get places matching query (asynchronously)
  let parameters = {
    q: query
  };
  $.getJSON("/search", parameters, function(data, textStatus, jqXHR) {

    // Call typeahead's callback with search results (i.e., places)
    asyncResults(data);
  })
  .fail(function(jqXHR, textStatus, errorThrown) {

    // log error to browser's console
    console.log(errorThrown.toString());

    // call typeahead's callback with no results
    asyncResults([]);
  });
}

// opens the info window at a particular marker with nes content
function showInfo(marker, content)
{
  var div = "<div id='info'>";
  if(typeof(content) == "undefined"){
    div += "<img alt='loading' src='/static/ajax-loader.gif'/>"
  }else {
    div += content;
  }

  div += "</div>";
  info.setContent(div);
  info.open(map, marker)

}

// Update UI's markers
function update()
{
    // Get map's bounds
    let bounds = map.getBounds();
    let ne = bounds.getNorthEast();
    let sw = bounds.getSouthWest();

    // Get places within bounds (asynchronously)
    let parameters = {
        ne: `${ne.lat()},${ne.lng()}`,
        q: $("#q").val(),
        sw: `${sw.lat()},${sw.lng()}`
    };
    $.getJSON("/update", parameters, function(data, textStatus, jqXHR) {

       // Remove old markers from map
       removeMarkers();

       // Add new markers to map
       for (let i = 0; i < data.length; i++)
       {
          setTimeout(function(){
            addMarker(data[i]);
          }, i * 200);
          
       }
    });
};
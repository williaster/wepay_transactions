/*
 * WePay global transactions visualization.
 *
 * @date:   2014-11
 * @author: christopher c williams
 *			sky arcs modified from: http://bl.ocks.org/dwtkns/4973620
 */

// TODO:
// 		hover labels for arcs
//		make arc path tips glow with gauss blur?
//
//
// DONE:
// 		shadows for arcs
//		arc transition
//  	arc dom removal

// fake data ------------------------------------------------------------------
var transactions = [
	{ "type": "Feature", "geometry": { "type": "LineString", "coordinates": [ [-155, 20], [-84.5, 43] ] } },
	{ "type": "Feature", "geometry": { "type": "LineString", "coordinates": [ [-81,  27], [-84.5, 43] ] } },
	{ "type": "Feature", "geometry": { "type": "LineString", "coordinates": [ [-7,  51],  [-84.5, 43] ] } }  
];

	// vis functions ----------------------------------------------------------
	var width  = 1000,
	    height = 550;

	var svg = d3.select("#vis").append("svg")
	  .attr("width", width)
	  .attr("height", height);

	// there are two projection levels, the land (projection), and the sky
	var projection = d3.geo.orthographic()
	    .scale(500)
	    .rotate([105,-10,0]) 			// center on USA
	    .translate([width / 2, height]) // upper hemisphere only
	    .clipAngle(90)
	    .precision(.1);

	var sky = d3.geo.orthographic()
	    .scale(1.4 * projection.scale()) // determines height of arcs
	    .rotate([105,-10,0])
	    .translate([width / 2, height])
	    .clipAngle(90);

	// for drawing on the land, and sky
	var path = d3.geo.path() 
		.projection(projection);

	var sky_line = d3.svg.line()
		.x(function(d) { return d[0]; }) 
		.y(function(d) { return d[1]; })
		.interpolate("cardinal") // will use only 3 points, must smooth
		.tension(0.0); 			 // 1 = straight lines

	// layer 0: glow
	// TODO: make background circle for glow

	// layer 1: water, a geojson 'sphere type'
	svg.append("defs").append("path")
		.datum( {type: "Sphere"} )
		.attr("id", "globe")
		.attr("d", path);
	svg.append("use")
	    .attr("class", "stroke")
	    .attr("xlink:href", "#globe");
	svg.append("use")
	    .attr("class", "fill")
	    .attr("xlink:href", "#globe");

	// layer 2: lat / long lines
	var graticule = d3.geo.graticule();

	var lines_latlong = svg.append("path")
		.datum(graticule)
		.attr("class", "graticule")
		.attr("d", path);

	var g = svg.append("g");
	var countries, transaction_groups;

	d3.json("data/maps/countries2.topo.json", function(error, world) {
	  
		if (error) return console.log(error); 
		d3.select("div#loading").remove(); 

		// layer 3, land
		countries = g.append("path")
			.datum( topojson.feature(world, world.objects.countries) )
			.attr("class", "land")
			.attr("d", path);

		// layer 4: arcs in sky, and their shadows
		//animate_transactions(transactions);
		transaction_groups = svg.append("g").attr("class", "transactions")
			.selectAll("g")
			.data(transactions)
		  .enter().append("g")
		  	.attr("class", "transaction-group");
		
		transaction_groups.each( show_transaction );
	});

	// helper functions -------------------------------------------------------
	
	// TODO:
	// could a queue of specific length be used to remove arcs?
	// for a continually running animation, would need to delete dom elements b4 computer xplodes

	function show_transaction(d, i) {
		// before animation, initialize arc, arc shadow, and arc head
		var arc = d3.select(this).append("path")
			.attr("class", "transaction arc")
			.attr("d", function(d) { return sky_line( project_transaction(d) ); })
			.style("display", "none");

		var arc_shadow = d3.select(this).append("path")
			.attr("class", "transaction shadow")
			.attr("d", path)
			.style("display", "none");

		var arc_head = d3.select(this).append("circle")
			.attr("filter", "url(#glow)")
			.attr("class", "arc-head")
			.attr("cx", -1000)
			.attr("cy", -1000)
			.attr("r", function(d) { return 2; });

		// now animate
		animate_transaction(arc, arc_shadow, arc_head, (10*i)+2000);
	}

	// wrapped into function to sync animation times for all components
	// of a transaction
	function animate_transaction(arc, arc_shadow, arc_head, delay) {

		var duration   	  = 10,
			arc_length    = arc.node().getTotalLength(),
			shadow_length = arc_shadow.node().getTotalLength();

		// TODO: DRY / clean into a function ?

		arc
			.attr("stroke-dasharray",  arc_length + " " + arc_length)
			.attr("stroke-dashoffset", arc_length)
			.style("display", "")
			.transition()
				.delay(delay)
				.duration(arc_length*duration)
				.attr("stroke-dashoffset", 0)
			.transition()
				.delay(arc_length*duration + delay)
				.attr("stroke-dashoffset", -arc_length);

		arc_shadow
			.attr("stroke-dasharray",  shadow_length + " " + shadow_length)
			.attr("stroke-dashoffset", shadow_length)
			.style("display", "")
			.transition()
				.delay(delay)
				.duration(arc_length*duration)
				.attr("stroke-dashoffset", 0)
			.transition()
				.delay(arc_length*duration + delay)
				.duration(arc_length*duration)
				.attr("stroke-dashoffset", -shadow_length)
				.each("end", function() { this.parentNode.remove(); });

		arc_head
		    .transition()
		    	.delay(delay)
	        	.duration(arc_length*duration)
	        	.attrTween('cx', function (d, i, a) {
			        return function (t) {
			          	return arc.node().getPointAtLength(t * arc_length).x;
			    	};
    			})
    			.attrTween('cy', function (d, i, a) {
			        return function (t) {
			          	return arc.node().getPointAtLength(t * arc_length).y;
			    	};
    			})
	        .transition()
				.delay(arc_length*duration + delay)
				.style("opacity", 0);
	}

	function location_along_arc(start, end, loc) {
		var interpolator = d3.geo.interpolate(start, end);
		return interpolator(loc);
	}

	// Returns 3-element array of projected coordinates for a txn,
	// the outer elements are projected on land, the middle in the sky
	function project_transaction(transaction) {
	    var source = transaction.geometry.coordinates[0],
	        target = transaction.geometry.coordinates[1],
	        mid    = location_along_arc(source, target, .5);

		return [ projection(source), sky(mid), projection(target) ]
	}


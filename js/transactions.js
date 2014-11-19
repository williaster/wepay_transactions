/*
 * WePay global transactions visualization.
 *
 * @date:   2014-11
 * @author: christopher c williams
 *			sky arcs modified from: http://bl.ocks.org/dwtkns/4973620

 */

// TODO:
// 		hover labels for arcs ?
// 		could a queue of specific length be used to remove arcs?
//		real data 
// 		colors for different apps
// 		time brush
// 		counter
// 		wepay logo
	
// DONE:
// 		shadows for arcs
//		arc transition
//  	arc dom removal
//		make arc path tips glow with gauss blur?

// fake data ------------------------------------------------------------------
var transactions = [
	{ "type": "Feature", "geometry": { "type": "LineString", "coordinates": [ [-155, 20], [-84.5, 43] ] }, "properties" : { "time" : 1000 } },
	{ "type": "Feature", "geometry": { "type": "LineString", "coordinates": [ [-81,  27], [-84.5, 43] ] }, "properties" : { "time" : 1003 }  },
	{ "type": "Feature", "geometry": { "type": "LineString", "coordinates": [ [-7,  51],  [-84.5, 43] ] }, "properties" : { "time" : 1005 }  }  
];

	// vis functions ----------------------------------------------------------
	var width  = 1200,
	    height = 650;

	var svg = d3.select("#vis").append("svg")
	  .attr("class", "svg")
	  .attr("width", width)
	  .attr("height", height);


	var defs = svg.append("defs");
	
	defs.append("filter") // this is for transaction arc-head blur
		.attr("id", "blur")
		.attr("x", "-150%").attr("y", "-150%") // make filter canvas bigger, so blur doesn't become square
		.attr("width", "300%").attr("height", "300%")
		.append("feGaussianBlur")
		.attr("stdDeviation", 3);

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
		.tension(0.0); 			 // 1 = straight/kinked lines

	// layer 0: glow
	// TODO: make background circle for glow

	// layer 1: water, a geojson 'sphere type'
	var ocean = svg.append("path")
		.datum( {type: "Sphere"} )
		.attr("class", "globe")
		.attr("d", path);	

	// layer 2: lat / long lines
	var graticule = d3.geo.graticule();

	var lines_latlong = svg.append("path")
		.datum(graticule)
		.attr("class", "graticule")
		.attr("d", path);

	var g = svg.append("g");
	var countries, transaction_groups, txn_idx;





	d3.json("data/maps/countries2.topo.json", function(error, world) {
	  
		d3.json("data/txns/1000_txns_latlong.json", function(error2, transactions) {
			
			console.log(transactions.length + "transactions loaded");
			
			transactions.forEach(function(txn){
				txn["type"]     = "Feature";
				txn["geometry"] = {
					"type": "LineString",
					"coordinates": [ eval(txn.from_coord), eval(txn.to_coord) ]
				};
			})

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
			
			txn_idx = 0;
			d3.timer( recursive_transaction_callback(), 1000);

			//transaction_groups.each( show_transaction );	
		});

	});

	// helper functions -------------------------------------------------------

	/* 
	* recursive function for creating and returning transaction callbacks
	* returns new functions because timers are mapped to instances, so 
	* terminating a single instance in a timer would stop all future callbacks
	* ( see http://bit.ly/1GQ6AhU )
	*/
	function recursive_transaction_callback() {
		if (txn_idx >= transaction_groups.size()) { // base case: no more transactions
			return function() { return true; };
		
		} else if (txn_idx == transaction_groups.size() - 1) { // last transaction
			return get_transaction_callback(0); 

		} else { // compute next interval based on real time between these transactions
			var curr_txn_data = transaction_groups[0][txn_idx].__data__,
				next_txn_data = transaction_groups[0][txn_idx + 1].__data__,
				interval      = (next_txn_data.time - curr_txn_data.time) / 10; // ms
			
			return get_transaction_callback(interval); 
		}
	}

	/*
	* shows a transaction for the current txn_idx, increments txn_idx,
	* and returns a callback function to be used with d3.timer, 
	* with the specified interval
	*/
	function get_transaction_callback(interval) {
		return function() { 
			show_transaction( transaction_groups[0][txn_idx] );
			
			txn_idx += 1;
			d3.timer(recursive_transaction_callback(), interval);

			return true; // stops the callback function
		};
	}

	// initializes the arc, arc_shadow, and arc_head components of a transaction
	// then animates them based on arc length
	function show_transaction(transaction_group) {

		// before animation, initialize arc, arc shadow, and arc head
		var arc = d3.select(transaction_group).append("path")
			.attr("class", "transaction arc")
			.attr("d", function(d) { return sky_line( project_transaction(d) ); })
			.style("display", "none");

		var arc_shadow = d3.select(transaction_group).append("path")
			.attr("class", "transaction shadow")
			.attr("d", path)
			.style("display", "none");

		var arc_head = d3.select(transaction_group).append("circle")
			.attr("class", "arc-head")
			.attr("filter", "url(#blur)")
			.attr("cx", -1000)
			.attr("cy", -1000)
			.attr("r", function(d) { return 1; });

		// now animate
		animate_transaction(arc, arc_shadow, arc_head);
	}

	// arcs are animated based on a css dashed line trick, while the arc head
	// positions are computed explicitly through an attrTween based on the arc path
	// 
	// this is wrapped into a function to sync animation times for all components
	// of a transaction, which depend on the length of the arc
	function animate_transaction(arc, arc_shadow, arc_head) {
		// TODO: DRY / clean arc transitions into a function ?

		var in_duration   = 1,
			out_duration  = 1,
			arc_length    = arc.node().getTotalLength(),
			shadow_length = arc_shadow.node().getTotalLength();

		arc
			.attr("stroke-dasharray",  arc_length + " " + arc_length)
			.attr("stroke-dashoffset", arc_length)
			.style("display", "")
			.transition()
				.duration(arc_length*in_duration)
				.attr("stroke-dashoffset", 0)
			.transition()
				.duration(arc_length*out_duration)
				.attr("stroke-dashoffset", -arc_length);

		arc_shadow
			.attr("stroke-dasharray",  shadow_length + " " + shadow_length)
			.attr("stroke-dashoffset", shadow_length)
			.style("display", "")
			.transition()
				.duration(arc_length*in_duration)
				.attr("stroke-dashoffset", 0)
			.transition()
				.duration(arc_length*out_duration)
				.attr("stroke-dashoffset", -shadow_length)

		arc_head
		    .transition()
	        	.duration(arc_length*in_duration)
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
    		.attr("r", function(d) { return 3; }) 
    		.transition()
				.attr("r", function(d) { return 10; })
				.attr("opacity", 0.5)
				.duration((in_duration + out_duration) * arc_length)
				.each("end", function() { this.parentNode.remove(); }); 
    }

	// Interpolates the position of a location along an arc
	function location_along_arc(start, end, loc) {
		var interpolator = d3.geo.interpolate(start, end);
		return interpolator(loc);
	}

	// Returns 3-element array of projected coordinates for a transaction,
	// the outer elements are projected on land, the middle in the sky
	function project_transaction(transaction) {
	    var source = eval(transaction.from_coord),
	        target = eval(transaction.to_coord),
	        mid    = location_along_arc(source, target, 0.5);

	    return[ projection(source), sky(mid), projection(target) ];
	}


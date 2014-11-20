/*
 * WePay global transactions visualization.
 *
 * @date:   2014-11
 * @author: christopher c williams
 *			sky arcs modified from: http://bl.ocks.org/dwtkns/4973620
 */

 /*
 TODO:
// 		map color to id or at least vary/set variable
// 		X map arc size to gross
// 		figure out histogram update logistics
// 				- will compute range and counts for x/y scale at the start, #bins fixed (12?)
					- assume input array is sorted, so easy to get min/max date 
// 				- this returns an array of 
//			create histogram line chart (use example of putting all pts on end?)
//		transaction counter
// 		sliders for speed/vars
// 		get flask set up
// 		wepay logo
			- download font @https://www.google.com/fonts/specimen/Lato
			  SO: http://stackoverflow.com/a/21597143/1933266
// 		convert to using margins to offset svg grid components: 
			- are offsets all within entire canvas?
			- map, timeline, counter, logo, sliders
	
*/	


	// vis functions ----------------------------------------------------------

	// sizes and margins of all visualization components
	var visMargins = { top: 0, right: 0, bottom: 0, left: 0 },
		visWidth   = 1200 - visMargins.left - visMargins.right,
		visHeight  = 650  - visMargins.top  - visMargins.bottom;
	
	var mapMargins = { top: 0, right: 40, bottom: 0.22*visHeight, left: 0.2*visWidth },
		mapWidth   = 1200  - mapMargins.left - mapMargins.right,
		mapHeight  = 650   - mapMargins.top  - mapMargins.bottom;	

	var timelineMargins = { top: mapHeight + mapMargins.top + 20,
							right: mapMargins.right, bottom: 20, left: mapMargins.left },
		timelineWidth   = mapWidth,
		timelineHeight  = visHeight - timelineMargins.top - timelineMargins.bottom;

	// The actual svg components, these handles are added to below
	var vis = d3.select("#vis").append("svg")
		.attr("class", "vis")
		.attr("width",  visWidth)
		.attr("height", visHeight);

	var map = vis.append("svg")
		.attr("class", "map")
		.attr("width",  mapWidth + mapMargins.left + mapMargins.right)
		.attr("height", mapHeight+ mapMargins.top)
	  .append("g")
		.attr("transform", "translate(" + mapMargins.left + ", " + mapMargins.top + ")")

	var timeline = vis.append("svg")
		.attr("class", "txn-timeline")
		.attr("width",  timelineWidth + timelineMargins.left + timelineMargins.right)
		.attr("height", timelineHeight + timelineMargins.top + timelineMargins.bottom)
	  .append("g")
		.attr("transform", "translate(" + timelineMargins.left + ", " + timelineMargins.top + ")");
	 
		
	var defs = vis.append("defs");
	
	defs.append("filter") // this is for transaction arc-head blur
		.attr("id", "blur")
		// make filter canvas bigger, so blur doesn't become square
		.attr("x", "-150%").attr("y", "-150%") 
		.attr("width", "300%").attr("height", "300%")
		.append("feGaussianBlur")
		.attr("stdDeviation", 3);

	// there are two projection levels, the land (projection), and the sky
	var projection = d3.geo.orthographic()
	    .scale(470)
	    .rotate([105,-10,0]) 			// center on USA
	    .translate([mapWidth / 2, mapHeight]) // upper hemisphere only
	    .clipAngle(90)
	    .precision(.1);

	var sky = d3.geo.orthographic()
	    .scale(1.4 * projection.scale()) // determines height of arcs
	    .rotate([105,-10,0])
	    .translate([mapWidth / 2, mapHeight])
	    .clipAngle(90);

	// transaction count timeline set up
	var n_timeline_bins  = 40, // only approx, depends on vals
		n_timeline_ticks = 15;

	var txn_timeline_x = d3.time.scale()
		.range([0, timelineWidth]);

	var txn_timeline_y = d3.scale.linear()
		.range([timelineHeight, 0]);

	var txn_timeline_xaxis = d3.svg.axis()
		.scale(txn_timeline_x)
		.tickSize(5)
		//.tickFormat(d3.time.format("%b-%d %I:%M%p"))
		.orient("bottom");

	var timeline_area = d3.svg.area()
		.interpolate("monotone")
	    .x(function(d) {  return txn_timeline_x(d.x); })
	    .y0(timelineHeight)
	    .y1(function(d) { return txn_timeline_y(d.y); });

	var timeline_line = d3.svg.line()
		.interpolate("monotone")
	    .x(function(d) { return txn_timeline_x(d.x); })
	    .y(function(d) { return txn_timeline_y(d.y); });

	var timeline_fill = timeline.append("path")
		.attr("class", "timeline-area");

	var timeline_path = timeline.append("path")
		.attr("class", "timeline-path");

	var timeline_axis = timeline.append("g")
		.attr("class", "timeline-axis")
		.attr("transform", "translate(0," + timelineHeight + ")");


	// for drawing on the land, and sky
	var path = d3.geo.path() 
		.projection(projection);

	var sky_line = d3.svg.line()
		.x(function(d) { return d[0]; }) 
		.y(function(d) { return d[1]; })
		.interpolate("cardinal") // will use only 3 points, must smooth
		.tension(0.0); 			 // 1 = straight/kinked lines

	var txn_strokewidth = d3.scale.linear()
		.range([1.5,8])
		.domain([0,1000])
		.clamp(true); // no massive lines for txn amts outside the domain

	// variable sliders
	var speed_multiplier = 5; // 100x = don't exceed :)


	// layer 0: glow
	// TODO: make background circle for glow

	// layer 1: water, a geojson 'sphere type'
	var ocean = map.append("path")
		.datum( {type: "Sphere"} )
		.attr("class", "globe")
		.attr("d", path);	

	// layer 2: lat / long lines
	var graticule = d3.geo.graticule();

	var lines_latlong = map.append("path")
		.datum(graticule)
		.attr("class", "graticule")
		.attr("d", path);

	var g = map.append("g");
	
	var countries, transaction_groups, timeline_cts,
		txn_ct   = 0, // cumulative txn count
		txn_idx  = 0, // idx of current txn
		time_idx = 0; // idx of txn count timeline
	
	d3.json("data/maps/countries2.topo.json", function(error, world) {
		// at this point need actual data points
		d3.json("data/txns/1000_txns_latlong.json", function(error2, transactions) {
			
			d3.select("div#loading").remove(); 
			if (error) return console.log(error); 
			console.log(transactions.length + "transactions loaded");

			geoJSONify(transactions); 				  // add geoJSON features to each txn
			timeline_cts = get_txn_cts(transactions); // update timeline domain, computes cts

			timeline_fill
				.datum(timeline_cts)
				.attr("d", timeline_area);

			timeline_path
				.attr("d", function(d) { return timeline_line(timeline_cts); });

			console.log(timeline_cts);

			// layer 3, land
			countries = g.append("path")
				.datum( topojson.feature(world, world.objects.countries) )
				.attr("class", "land")
				.attr("d", path);

			// layer 4: arcs in sky, and their shadows
			//animate_transactions(transactions);
			transaction_groups = map.append("g").attr("class", "transactions")
				.selectAll("g")
				.data(transactions)
			  .enter().append("g")
			  	.attr("class", "transaction-group");
			
			txn_idx  = 0,
			time_idx = 0, // can have multiple txns per time unit (ms)
			start_delay = 1000;
			//d3.timer( recursive_transaction_callback(), start_delay); 
		});

	});

	// helper functions -------------------------------------------------------

	function make_land() {}
	
	/*
	 * Updates the x and y txn_timeline domains based on transaction values
	 * Computes transactions counts over time using the d3 histogram layout
	 * but removes actual txn objs fom the resulting binned counts for space
	 */
	function get_txn_cts(transactions) {
		// Update the domain to the current transactions, needed for bins
		txn_timeline_x.domain([transactions[0].time, 
					           transactions[transactions.length - 1].time]);

		timeline_axis.call(txn_timeline_xaxis);

		var timeline_cts = d3.layout.histogram()
			.value(function(d) { return d.time; })
			.bins( txn_timeline_x.ticks(n_timeline_bins) )
			(transactions)
			// .map(function(d) { // removes txns from bins to save space; only need cts
			// 	return { x: d.x, y: d.y, dx: d.dx }; 
			// }); 

		// Update y domain based on count values
		txn_timeline_y.domain([0, d3.max(timeline_cts, function(d) { return d.y; })]);

		return timeline_cts;
	}

	/*
	 * adds a LineString geoJSON feature to each transaction using to/from coords 
	 * this is used to draw paths on the globe (not sky).
	 */
	function geoJSONify(transactions) {
		transactions.forEach(function(txn){
			txn["type"]     = "Feature";
			txn["geometry"] = {
				"type": "LineString",
				"coordinates": [ eval(txn.from_coord), eval(txn.to_coord) ]
			}
		});
	}

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
				interval_ms   = (next_txn_data.time - curr_txn_data.time) / speed_multiplier; 
			
			return get_transaction_callback(interval_ms); 
		}
	}

	/*
	 * shows a transaction for the current txn_idx, increments txn_idx,
	 * and returns a callback function to be used with d3.timer, 
	 * with the specified interval
	 */
	function get_transaction_callback(interval) {
		return function() { 
			var txn = transaction_groups[0][txn_idx];
			
			show_transaction(txn); 		  // display arcs
			update_txn_counter(++txn_ct); // update counter
			update_txn_timeline(txn); 	  // update timeline

			txn_idx++;
			d3.timer(recursive_transaction_callback(), interval);

			return true; // stops the callback function
		};
	}

	// 
	function update_txn_timeline(curr_txn, time_idx) {
		var curr_
		if (curr_txn.time < 3) {

		} 
		return;
	}

	function update_txn_counter(curr_ct) {
		return;
	}

	// initializes the arc, arc_shadow, and arc_head components of a transaction
	// then animates them based on arc length
	function show_transaction(transaction_group) {

		// before animation, initialize arc, arc shadow, and arc head
		var arc = d3.select(transaction_group).append("path")
			.attr("class", "transaction arc")
			.attr("stroke-width", function(d) { return txn_strokewidth( d.amount ); })
			.attr("d", function(d) { return sky_line( project_transaction(d) ); })
			.style("display", "none");

		var arc_shadow = d3.select(transaction_group).append("path")
			.attr("class", "transaction shadow")
			.attr("stroke-width", function(d) { return txn_strokewidth( d.amount ); })
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

		var in_duration   = 2,
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


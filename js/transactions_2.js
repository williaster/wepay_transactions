/*
 * WePay global transactions visualization.
 *
 * @date:   2014-11
 * @author: christopher c williams
 *			sky arcs modified from: http://bl.ocks.org/dwtkns/4973620
 */

 /*
 TODO:
 		- sliders for speed/vars
 		- deal with timeline updates when new data is loaded
 		- get flask set up
 		- convert to using margins to offset svg grid components: 
			- map, timeline, counter, logo, sliders
		- get data function
		- refactor
*/	


	// vis functions ----------------------------------------------------------
	
	var data_file  = "data/txns/100_part1_txns_latlong.json"; // "data/txns/100_txns_latlong.json "; //
	var data_file2 = "data/txns/100_part2_txns_latlong.json";

	// variable sliders
	var speed_multiplier = 5, // 100x = don't exceed :)
		txn_duration_in  = 2,
		txn_duration_out = 1;

	var max_transactions = 50000, // max transactions in the timeline.
		max_pause_ms = 2000; 	  // deviates from reality more by minimizing time
							  	  // gap between transactions. decreasing makes the
								  // the speed slider more responsive, especially for
								  // slow speeds (because speed change doesn't take
								  // effect until the next-queued txn fires);

	
	var countries, transaction_groups, timeline_cts, transactions,
		start_delay = 1000,
		txn_ct   = 0, // cumulative txn count
		txn_idx  = 0, // idx of current txn
		time_idx = 0; // idx of timeline count bin

	// sizes and margins of all visualization components
	var visMargins = { top: 0, right: 0, bottom: 0, left: 0 },
		visWidth   = 1200 - visMargins.left - visMargins.right,
		visHeight  = 650  - visMargins.top  - visMargins.bottom;
	
	var mapMargins = { top: 0, right: 40, bottom: 0.24*visHeight, left: 0.2*visWidth },
		mapWidth   = 1200  - mapMargins.left - mapMargins.right,
		mapHeight  = 650   - mapMargins.top  - mapMargins.bottom;	

	var timelineMargins = { top: mapHeight + mapMargins.top + 20,
							right: mapMargins.right, 
							bottom: 40, 
							left: mapMargins.left },
		timelineWidth   = mapWidth,
		timelineHeight  = visHeight - timelineMargins.top - timelineMargins.bottom;

	var logoMargin = { top: 100, right: 0, bottom: 0, left: 25, we_pay_margin: 1 },
		logoWidth  = 300 - logoMargin.left - logoMargin.right,
		logoHeight = 200 - logoMargin.top  - logoMargin.bottom;

	var counterMargin = { top: logoHeight + logoMargin.top + logoMargin.bottom,
						  right: logoMargin.right, 
						  bottom: logoMargin.bottom, 
						  left: logoMargin.left },
		counterWidth  = 300 - counterMargin.left - counterMargin.right,
		counterHeight = 300 - counterMargin.top  - counterMargin.bottom;

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

	// WePay logo 
	var logo = vis.append("svg")
		.attr("class", "logo")
		.attr("width",  logoWidth  + logoMargin.left + logoMargin.right)
		.attr("height", logoHeight + logoMargin.top  + logoMargin.bottom)
	  .append("g")
	  	.attr("transform", "translate(" + logoMargin.left + ", " + logoMargin.top + ")");
	  
	var we = logo.append("text")
		.attr("class", "blue")
		.text("we");

	var pay = logo.append("text")
		.attr("class", "green")
		.text("pay")
		.attr("transform", "translate(" + (+we[0][0].offsetWidth + logoMargin.we_pay_margin) + ",0)");

	// Transaction counter
	var txn_counter = vis.append("svg")
		.attr("class", "txn-counter")
		.attr("width",  counterWidth  + counterMargin.left + counterMargin.right)
		.attr("height", counterHeight + counterMargin.top  + counterMargin.bottom)
	  .append("g")
	  	.attr("transform", "translate(" + counterMargin.left + "," + counterMargin.top + ")");

	var txn_counter_ct = txn_counter.append("text")
		.attr("class", "transaction-ct")
		.text("0");

	var txn_counter_label = txn_counter.append("text")
		.attr("class", "ct-label")
		.text("Total transactions")
		.attr("transform", "translate(0, " + 25 + ")");

	// there are two projection levels, the land (projection), and the sky
	var projection = d3.geo.orthographic()
	    .scale(470)
	    .rotate([105,-10,0]) 			// center on USA
	    .translate([mapWidth / 2, mapHeight]) // upper hemisphere only
	    .clipAngle(90)
	    .precision(.1);

	var sky = d3.geo.orthographic()
	    .scale(1.4 * projection.scale()) // projection scale differential determines 3D height of arcs
	    .rotate([105,-10,0])
	    .translate([mapWidth / 2, mapHeight])
	    .clipAngle(90);

	// Transaction count timeline 
	var timeline = vis.append("svg")
		.attr("class", "txn-timeline")
		.attr("width",  timelineWidth + timelineMargins.left + timelineMargins.right)
		.attr("height", timelineHeight + timelineMargins.top + timelineMargins.bottom)
	  .append("g")
		.attr("transform", "translate(" + timelineMargins.left + ", " + timelineMargins.top + ")");
	
	var n_timeline_bins  = 75, // only approx, depends on vals
		n_timeline_ticks = 15,
		timeline_bars, timeline_g;

	var txn_timeline_x = d3.time.scale()
		.range([0, timelineWidth]);

	var txn_timeline_y = d3.scale.linear()
		.range([timelineHeight, 0]);

	var txn_timeline_xaxis = d3.svg.axis()
		.scale(txn_timeline_x)
		.tickSize(5)
		.orient("bottom");

	var timeline_hist = timeline.append("g")
		.attr("class", "timeline-histogram");

	var timeline_axis = timeline.append("g")
		.attr("class", "timeline-axis")
		.attr("transform", "translate(0," + timelineHeight + ")");

	timeline_axis.append("text") // y-label
		.attr("class", "timeline-ylabel")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(-10," + -timelineHeight/2 + ")rotate(-90)")
	  	.text("# Transactions");

	timeline_axis.append("text") // x-label
		.attr("class", "timeline-xlabel")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" + timelineWidth / 2 + "," + 0.9*timelineMargins.bottom + ")")
	  	.text("Time");


	// for drawing on the land, and sky
	var path = d3.geo.path() 
		.projection(projection);

	var sky_line = d3.svg.line()
		.x(function(d) { return d[0]; }) 
		.y(function(d) { return d[1]; })
		.interpolate("cardinal") // will use only 3 points, must smooth
		.tension(0.0); 			 // 1 = straight/kinked lines

	var arc_strokewidth = d3.scale.linear()
		.range([1.5,8])
		.domain([0,1000])
		.clamp(true); // no massive lines for txn amts outside the domain

	var arc_color = d3.scale.category10();

	// variable sliders
	var slider_margin = { top: counterMargin.top + 40, right: 320, bottom: 15, left: 25, 
						  label_space: 15, speed_margin: 11 },
		slider_width  = 450 - slider_margin.left - slider_margin.right,
		slider_height = 100 - slider_margin.top  - slider_margin.bottom + counterMargin.top;

	var speed_scale = d3.scale.linear()
		.domain([1, 1000]) // 0.5-100x real time
		.range([0, slider_width])
		.clamp(true); 

	var speed_brush = d3.svg.brush()
		.x(speed_scale)
		.extent([speed_multiplier,speed_multiplier]) 
		.on("brush", update_speed);

	var slider_container = vis.append("svg")
		.attr("class", "slider-container")
		.attr("width",  slider_width  + slider_margin.left + slider_margin.right)
		.attr("height", slider_height + slider_margin.top  + slider_margin.bottom)
	  .append("g")
	  	.attr("transform", "translate(" + slider_margin.left + "," + slider_margin.top + ")");

	var speed_axis = slider_container.append("g")
		.attr("class", "speed-axis")
		.attr("transform", "translate(0," + slider_height / 2 + ")")
      .call( d3.svg.axis()
      		   .scale(speed_scale)
      		   .tickSize(0) )
    	.selectAll(".tick").remove(); // call after axis is made

	var speed_slider = slider_container.append("g")
		.attr("class", "speed-slider")
		.call(speed_brush);

	speed_slider // brushes typically support extent and re-sizing, not used here
		.selectAll(".extent,.resize").remove();

	speed_slider.select(".background")
		.attr("height", slider_height);

	var speed_handle = speed_slider.append("circle")
		.attr("class", "slider-handle")
		.attr("transform", "translate(0," + slider_height/2 + ")")
		.attr("r", 6);

	var speedlabel_speed = slider_container.append("text")
		.attr("class", "speed-label-speed")
		.attr("transform", "translate(" + (+slider_width + slider_margin.speed_margin) + "," + slider_height/2 + ")");

	var speedlabel_label = slider_container.append("text")
		.attr("class", "speed-label-label")
		.text("real time")
		.attr("transform", "translate(" + (+slider_width + +speedlabel_speed[0][0].offsetWidth + +slider_margin.label_space) + "," + slider_height/2 + ")");

	speed_slider.call(speed_brush.event);
	update_speedlabel();

	// SVG styling definitions
	var defs = vis.append("defs");
	
	defs.append("filter") // this is for transaction arc-head blur
		.attr("id", "blur")
		// make filter canvas bigger, so blur doesn't become square
		.attr("x", "-150%").attr("y", "-150%") 
		.attr("width", "300%").attr("height", "300%")
		.append("feGaussianBlur")
		.attr("stdDeviation", 3);


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
	
	d3.json("data/maps/countries2.topo.json", function(error, world) {	
		d3.json(data_file, function(error2, txns) {
			transactions = txns;

			// layer 3, land
			countries = g.append("path")
				.datum( topojson.feature(world, world.objects.countries) )
				.attr("class", "land")
				.attr("d", path);


			parse_txns(transactions); 		// add geoJSON features to each txn
			timeline_cts = 					// update timeline domain, computes cts
				get_txn_cts(transactions, 0); 

			// console.log(timeline_cts);
			// console.log(transactions);

			init_timeline();
			build_transactions_groups();
		});
	});

	// helper functions -------------------------------------------------------

	function reset_visualization(fillto_idx) {
			timeline_cts = reset_txn_cts(timeline_cts, fillto_idx);
			update_timeline();
			
			time_idx = 0;
			txn_idx  = 0;
			build_transactions_groups() // starts recursive timer
	}

	function reset_txn_cts(timeline_cts, fillto_idx) {
		
		for (var i=0; i < timeline_cts.length; i++) {
			
			var curr_txnbin = timeline_cts[i]
				new_value   = i < fillto_idx ? curr_txnbin.y : 0;
			
			curr_txnbin.curr_y = new_value; 
		}
		return timeline_cts;
	}

	/*
	 * Requests new data, parses it, and calls update_transaction_data
	 */
	function get_data(data_file) {
		// TODO: I think update txn data should actually call this not vice versa
		d3.json(data_file2, function(error, new_txns) {
			if (error) { return console.log(error); }
			
			parse_txns(new_txns); 
			update_transaction_data(new_txns);
		});
	}
	

	function update_transaction_data(new_txns) {
		// Case 1: if new_txns are indeed new, append them to current 
		//  	   transactions, slice to get as many transactions as possible 
		// 		   without exceeding max_transactions 
		if (new_txns[0].time.getTime() >= 
			transactions[transactions.length - 1].time.getTime()) {

			var n_old_keep = max_transactions - new_txns.length,
				old_txns   = n_old_keep > 0 ? transactions.slice(-n_old_keep) : [],
				new_txns   = new_txns.slice(-max_transactions);

			transactions = old_txns.concat(new_txns);

			// Here we update timeline_cts using all data because both new and old data
			// are displayed in the histogram; we then update transactions to include
			// only the new transactions because the old histogram counts will be filled
			// and we want arcs to feed from only the new point in time/new values
			timeline_cts = get_txn_cts(transactions, 5000); 
			transactions = new_txns; 
			
			var fillto_idx = get_fillto_idx(old_txns, timeline_cts);

			init_timeline();
			reset_visualization(fillto_idx);

			//console.log(transactions.length + " total txns after merge");
			//console.log(old_timeline_cts)
			//console.log(timeline_cts)

		} else { 
		// Case 2: new_txns are the same as current transactions, just loop
			console.log("same");
			reset_visualization(0);
		}

	}

	function get_fillto_idx(old_txns, timeline_cts) {
		var prev_maxtime = old_txns[old_txns.length - 1].time.getTime(),
			fillto_idx   = 0;

		// note: this does not guarantee that the counts around the old to new interface 
		//		 is perfect but it is within a few counts;
		for (var bin_idx = 0; bin_idx < timeline_cts.length; bin_idx++) {

			if (prev_maxtime > timeline_cts[bin_idx].x.getTime()) {
				fillto_idx = bin_idx;
		
		return fillto_idx;
	}

	function build_transactions_groups() {
		// remove old transactions group if it exists
		if (map.select("g")) { map.select("g.transactions").remove(); }

		// create new ones with the current data
		transaction_groups = map.append("g").attr("class", "transactions")
			.selectAll("g")
			.data(transactions)
		  .enter().append("g")
		  	.attr("class", "transaction-group");

		d3.timer( recursive_transaction_callback(), start_delay); 
	}
	
	/*	
	 * updates the text of the speedlabel slider label to reflect the current
	 * value of speed_multiplier
	 */
	function update_speedlabel() {
		speedlabel_speed.text( num_with_commas(Math.floor(speed_multiplier)) + "x");
		speedlabel_label
			.attr("transform", 
				  "translate(" + (+slider_width + 
 						 	      +speedlabel_speed[0][0].offsetWidth + 
 						 	      +slider_margin.label_space) + 
                         	 "," + slider_height/2 + ")");
	}
	/*
	 * Updates the speed position of the handle on the slider scale,
	 * and most importantly updates the global speed_multiplier variable
	 * which controls the timing between transaction arcs
	 */
	function update_speed() { 
		var curr_speed = speed_brush.extent()[0]; // same as [1]
		
		if (d3.event.sourceEvent) { // human event, not programmatic
    		curr_speed = speed_scale.invert(d3.mouse(this)[0]);
    		speed_brush.extent([curr_speed, curr_speed]);
  		}

  		speed_handle.attr("cx", speed_scale(curr_speed));
  		speed_multiplier = curr_speed; // determines live
  		update_speedlabel(); // update speed text

	}

	// Initializes the timeline
	function init_timeline() {
		if (timeline_hist.selectAll("g")) { timeline_hist.selectAll("g.timeline-bar").remove(); }
		
		timeline_g = timeline_hist.selectAll(".timeline-bar")
			.data(timeline_cts);
		
		//timeline_g.exit().remove();

		timeline_g.enter().append("g")
		  	.attr("class", "timeline-bar")
		  	.attr("transform", function(d) {
		  		return "translate(" + txn_timeline_x(d.x) + "," + txn_timeline_y(d.curr_y) + ")";
		  	});
	
		timeline_bars = timeline_g.append("rect")
			.attr("width",  function(d) { return txn_timeline_x( d.x1 ) - txn_timeline_x( d.x ); })
			.attr("height", function(d) { return timelineHeight - txn_timeline_y( d.curr_y ); });	
	}

	function update_timeline() {
		timeline_g.attr("transform", function(d) {
		  	return "translate(" + txn_timeline_x(d.x) + "," + txn_timeline_y(d.curr_y) + ")";
		});

		timeline_bars
			.attr("height", function(d) { 
				return timelineHeight - txn_timeline_y( d.curr_y ); 
			})
			.attr("width", function(d) {
				return txn_timeline_x( d.x1 ) - txn_timeline_x( d.x );
			})
		;
	}

	// Manages counts for txn timeline bins, including updating the time bin idx,
	// and updating "timeline-curr" classes based on the current timeline bin.
	function add_timeline_counts() {
		var curr_txn 	  = transactions[txn_idx],
			curr_bin 	  = timeline_cts[time_idx],
			is_last_txn   = txn_idx == (transactions.length - 1), 
			is_last_bin   = !(time_idx + 1 < timeline_cts.length),
			increment_bin = !(curr_txn.time < curr_bin.x1); 

		if (increment_bin && !is_last_bin) { // increment time index and recurse
			d3.select(timeline_bars[0][time_idx]).classed("timeline-curr", false);
			time_idx++;
			return add_timeline_counts();
		} else { 
			d3.select(timeline_bars[0][time_idx]).classed("timeline-curr", true);
			curr_bin.curr_y++;
			update_timeline();
		}
		if (is_last_txn) {
			d3.select(timeline_bars[0][time_idx]).classed("timeline-curr", false);
		}
	}
	
	// Adds commas to a number, better performance than n.toLocaleString();
	// source: http://stackoverflow.com/a/2901298
	function num_with_commas(n) { 
    	return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	/*
	 * Updates the x and y txn_timeline domains based on transaction values
	 * Computes transactions counts over time using the d3 histogram layout
	 * but removes actual txn objs fom the resulting binned counts for space
	 *
	 * @param duration  specifies the duration of the change in domain
	 */
	function get_txn_cts(transactions, duration) {
		// Update the domain to the current transactions, needed for bins
		txn_timeline_x
			.domain(d3.extent(transactions, function(d) { return d.time; }));

		// Update axis ticks once domain known, else default 1970 vals :(
		timeline_axis.transition().duration(duration).call(txn_timeline_xaxis); 

		var timeline_cts = d3.layout.histogram()
			.value(function(d) { return d.time; })
			.bins( txn_timeline_x.ticks(n_timeline_bins) )
			(transactions)
			.map(function(d, i) { // removes txns from bins to save space; only need cts
							   // converts dx to Date, instead of ms offset
				return { x: d.x, dx: d.dx, y: d.y, 
						 curr_y: 0,  x1: new Date( d.x.getTime() + d.dx ), }; 
			}); 

		// Update y domain based on count values
		txn_timeline_y.domain([0, d3.max(timeline_cts, function(d) { return d.y; })]);

		return timeline_cts;
	}

	/*
	 * Adds a LineString geoJSON feature to each transaction using to/from coords 
	 * this is used to draw paths on the globe (not sky). Converts time to an explicit
	 * Date object (from ms since epoch)
	 */
	function parse_txns(transactions) {
		transactions.forEach(function(txn){
			txn["time"]     = new Date(txn["time"]);
			txn["type"]     = "Feature";
			txn["geometry"] = {
				"type": "LineString",
				"coordinates": [ eval(txn.from_coord), eval(txn.to_coord) ]
			}
		});
	}

	/* 
	 * Recursive function for creating and returning transaction callbacks
	 * returns new functions because timers are mapped to instances, so 
	 * terminating a single instance in a timer would stop all future callbacks
 	 * ( see http://bit.ly/1GQ6AhU )
	 */
	function recursive_transaction_callback() {
		// base case: no more transactions, 
		if (txn_idx >= transaction_groups.size()) { 
			return function() { 
				get_data(data_file);
				return true; 
			};
		} else if (txn_idx == transaction_groups.size() - 1) { // last transaction
			return transaction_callback_factory(max_pause_ms); 

		} else { // compute next interval based on real time between these transactions
			var curr_txn_data = transaction_groups[0][txn_idx].__data__,
				next_txn_data = transaction_groups[0][txn_idx + 1].__data__,
				interval_ms   = (next_txn_data.time - curr_txn_data.time) / speed_multiplier; 
				interval_ms   = Math.min(max_pause_ms, interval_ms);

			//console.log("txn " + txn_idx + ", interval ms " + interval_ms)
			return transaction_callback_factory(interval_ms); 
		}
	}

	/*
	 * Returns a function that shows a transaction for the current txn_idx, 
	 * increments txn_idx, and returns a callback function to be used with 
	 * d3.timer, with the specified interval.
	 */
	function transaction_callback_factory(interval) {
		return function() { 
			var txn = transaction_groups[0][txn_idx];
			
			show_transaction(txn); 		  // display arcs
			update_txn_counter(++txn_ct); // update counter
			add_timeline_counts();        // update timeline
			txn_idx++;

			d3.timer(recursive_transaction_callback(), interval); // recurse after pause

			return true; // stops this callback instance (recurse not affected)
		};
	}

	function update_txn_counter(curr_ct) {
		txn_counter_ct.text( num_with_commas(curr_ct) );
	}

	// initializes the arc, arc_shadow, and arc_head components of a transaction
	// then animates them based on arc length
	function show_transaction(transaction_group) {
		var txn_color = arc_color(txn_idx % 20);

		// before animation, initialize arc, arc shadow, and arc head
		var arc = d3.select(transaction_group).append("path")
			.attr("class", "transaction arc")
			.attr("stroke", txn_color)
			.attr("stroke-width", function(d) { return arc_strokewidth( d.amount ); })
			.attr("d", function(d) { return sky_line( project_transaction(d) ); })
			.style("display", "none");

		var arc_shadow = d3.select(transaction_group).append("path")
			.attr("class", "transaction shadow")
			.attr("stroke-width", function(d) { return arc_strokewidth( d.amount ); })
			.attr("d", path)
			.style("display", "none");

		var arc_head = d3.select(transaction_group).append("circle")
			.attr("class", "arc-head")
			.attr("fill", txn_color)
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

		var arc_length    = arc.node().getTotalLength(),
			shadow_length = arc_shadow.node().getTotalLength();

		arc
			.attr("stroke-dasharray",  arc_length + " " + arc_length)
			.attr("stroke-dashoffset", arc_length)
			.style("display", "")
			.transition()
				.duration(arc_length*txn_duration_in)
				.attr("stroke-dashoffset", 0)
			.transition()
				.duration(arc_length*txn_duration_out)
				.attr("stroke-dashoffset", -arc_length);

		arc_shadow
			.attr("stroke-dasharray",  shadow_length + " " + shadow_length)
			.attr("stroke-dashoffset", shadow_length)
			.style("display", "")
			.transition()
				.duration(arc_length*txn_duration_in)
				.attr("stroke-dashoffset", 0)
			.transition()
				.duration(arc_length*txn_duration_out)
				.attr("stroke-dashoffset", -shadow_length)

		arc_head
		    .transition()
	        	.duration(arc_length*txn_duration_in)
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
				.duration((txn_duration_in + txn_duration_out) * arc_length)
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

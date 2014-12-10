##WePay transaction visualization 
Transaction data parsing and d3.js / Flask web application. Current project encompasses transaction data parsing, several d3 modules for different visualizations of transaction metrics, and three different views/pages designed for different use cases: <br>**lobby version, website version, and customer version**

#####Chris Williams (copyright WePay)
#####2014-Nov

##Contents 
see specific files for more detailed documentation, methods, parameters, etc.:

* **run.py**<br>
	Running run.py from the terminal will start the web app server 

* **app/**<br>
	Flask web app with three different views/pages for different use-cases 
	and functionality.

	####Pages/views
	* **about.html**<br>http://x.x.x.x:port/about
		* This is a mockup of use of the visualization on the WePay /about page
		* The only transaction component of this view is the map,
		  the header and footer are static content and could easily be 
		  changed
		* aboutpage.js requires a div#vis DOM element in the html page
		  to populate with the transaction map. Sizing of the map, and other variables can be set in
		  aboutpage.js
		* Currently the Flask view passes a hard-coded json datafile parameter (this 
		  could change daily, could sample different datasets, etc.) to the front end, which then 
		  loops on the transactions in that file
		* map.css is included for the map styles, about-lobby.css is 
		  included for the text styling, etc.
		* mapChart.js, util.js are required for the visualization, in addition to the other dependencies
<a href="#"><img src="https://github.com/williaster/wepay_transactions/blob/master/app/static/imgs/about.png" left-margin="15px" height="400" width="auto" ></a>

	* **lobby.html**<br>http://x.x.x.x:port/lobby[?ct=101]
		* This view is intended for use in the WePay office lobby.
		  It is slightly more complex than the about view and in addition 
		  to containing s a map chart as in about.html it has a counter which 
		  increments as transactions are animated. 
		* lobbypage.js requires a div#vis DOM element to populate with
		  the transactions map, and another element with a desired
		  id whose html contents will be replaced with transaction 
		  count values.
		* map.css is included for the map styles, about-lobby.css is 
		  included for the text styling
<a href="#"><img src="https://github.com/williaster/wepay_transactions/blob/master/app/static/imgs/lobby.png" align="middle" height="400" width="auto" left-margin="15px"></a>

	* **customer.html**<br>http://x.x.x.x:port/customer?id=filename[&ct=101&loop=true]
		* This view utilizes all transaction modules and provides the greatest funcitonality
		* It includes a transaction map, a transaction count timeline, a wepay logo, a transaction
		  counter, and sliders that control the speed and arc lifetime. Note: these same variables are
		  parameters in the other views / pages, and can be set to any value, the user simply
		  cannot tune them.
		* TODO: explain data cycle<br>
<a href="#"><img src="https://github.com/williaster/wepay_transactions/blob/master/app/static/imgs/customer.png" align="middle" height="auto" width="550" left-margin="15px"></a>
	
* **app/static/python/parse_transactions.py**<br>
	Python module (that can also be used as a script) for parsing .csv files of WePay transaction 
	data. This can be used to pre-process data, or be intergrated for live 
	parsing with the app itself. 

* **app/static/data/**<br>
	This is the data path. All global relative paths are set to point here 
	Transaction data, which can vary, lives in data/txns/, while requried/static map 
	coordinate data for the visualization lives in data/maps

* **app/static/js/**<br>
	(with the exception of the d3, topojson, and queue .js libraries which 
	live in static/lib,) All javascripts live here. The transaction visualization modules are broken out 
	into separate files in js/wepay so that only components that are used on a particular html page/view are added 
	to the d3.wepay namespace. 

	The controller scripts which use the d3.wepay modules to generate the individual pages / views are:
		* **aboutpage.js**
		* **lobbypage.js**
		* **customerpage.js**

* **app/static/js/wepay**<br>
	The d3.wepay modules. These currently include:
	
	* **mapChart.js** d3.wepay.map()<br>
		This is the map on which transactions are displayed. It has configurable parameters which 
		control the map size, transaction speed, arc lifetime, arc fade-in/-out time, etc. Because
		it is a central component of the visualization, it handles a fair amount of the logic 
		for transaction timing and some front-end data parsing..
	
	* **timelineChart.js** d3.wepay.timeline()<br>
		Can be used in conjunction with a mapChart. Displays counts of transactions over time
		as a bar chart. The map handles the logic for updating the timeline chart in sync with
		map transaction visualizations, if a timeline exists. Computes transaction time bins on its own.
		
	* **counter.js** d3.wepay.counter(), .minCounter()<br>
		Module which exposes both counter() and minCounter() objects to be used in conjuntion
		with a mapChart. Counter objects include a label and create their own svg DOM text 
		elements, while minCounters take a d3 DOM selection as input and update the htmlContent 
		of it with the current transaction count. Both objects take optional starting counts as input.

	* **slider.js** d3.wepay.slider()<br>
		Module which exposes slider objects that execute a callback function and pass the new 
		value upon slider value change. These can be positioned within other d3 selections.

	* **logo.js** d3.wepay.logo()<br>
		Makes a WePay SVG text object of a desired size and position within another d3 selection.
	
	* **util.js** d3.wepay.util.METHOD_NAME()<br>
		Utility methods such as color generators and helper functions for resetting 
		and controlling larger pieces of logic, such as updating data values and 
		resetting the visualization.
			
* **app/static/css/**<br>
	Style sheets for the views are kept here.  Note that the d3.js scripts and transaction modules 
	dynamically modify the DOM client-side and thus .css reference those elements. id names and classes 
	can be modified if the matching identifiers are updated in the XXXpage.js files. Currently the 
	lato font style is refferenced by http, and is not kept locally. 

* **app/static/templates/**<br>
	Flask-variable-embeded .html template fiels for the three rendered views live here. Note that the
	d3.js scripts and transaction modules dynamically modify the DOM client-side. 

##Front-end and Back-end design
####Back-end
	Data parsing/munging occurs on the back-end, and requests for the web app come to a __simple__ Flask app. 
	Some app views, such as the /about and /lobby pages, have hard-coded .json data files. The /customer customer 
	view takes an id parameter which currently specifies a filename. The front-end requires a .json file,
	so the back-end first looks for a .json file with the specified name, else if a .csv file with the specified
	name exists, it parses it when the request is made to make the .json file. If the file cannot be found, no file
	is returned and the front-endd returns a 404. Note that the only client-side data computations that occur are 
	timeline bins and counts.
	
####Front-end
	The front-end view that is served expects a .json data file parameter to display in the visualization. 
	Additional variables, such as loop, initial counter counts, maximum pause time between transactions, etc.
	can be passed from the back-end and converted to javascript variables in the view's .html template page.
	Minimal .html DOM structure is required to generate the visualization, as d3.js dynamically adds / removes
	from the DOM. In most views a div#vis element is required. The xxxpage.js files for each page use the
	wepay d3 modules to combine varioius visualization elements.

##Data size notes
The browser will stuggle when data size approaches or exceeds single digit MB (i.e., # of transactions exceeds ~40k). Currently there is a d3.wepay._maxTransactions parameter that filters transactions, taking the last _maxTransactions transactions loaded. A future improvement might be sampling data instead of using recency cutoffs, currently this would have to be done back-side.

##Dependencies
In addition to this repo's d3.wepay modules, there are a few JavaScript and Python library dependencies for this web app.

###Python:
* **Pandas** -- for transaction data parsing
* **argparse** -- to enable parsing transaction data as a script
* **Flask** -- web framework for web app (could be ported to any other framework easily)

###Javascript (these may live in the static/lib folder, or their URIs may be referenced):
* **d3.js** -- http://d3js.org/d3.v3.min.js<br>core visualization library
* **topojson.js** -- http://d3js.org/topojson.v1.min.js<br>essential for map rendering within d3
* **queue.js** -- http://d3js.org/queue.v1.min.js<br>minimal asynchronous helper module

###Other:
* **Lato** font is referenced as a stylesheet

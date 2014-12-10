info="""Flask view mapping for the WePay transactions visualization app. See
        specific view funtionsn for more information.
     """

__author__ = "christopher c williams"
__date__   = "2014-11" 

from app.static.python import parse_transactions as TxnsPrsr
from flask import render_template, request, jsonify
from app import app
import pandas as pd 
import glob
import os

DATA_DIR        = "%s/static/data/txns" % os.path.dirname( os.path.realpath(__file__) )
REL_DATA_DIR    = "../static/data/txns"
CALLBACK_DOMAIN = "http://127.0.0.1:5000/update_data" # callback view for the d3 
                                                      # visualization to request
                                                      # the next data file

#..............................................................................
# Views
@app.route('/customer')
def customer(methods=["GET"]):
    """View that serves the WePay customer HTML page. Handles a GET request and
       expects a request 'id' parameter which serves as an identifier for the
       data to be loaded and served with the page. Currently, this view:
        1.  Searches for a .json file with the specified name in the data directory 
            and passes its relative path as the datafile parameter it if found
        2.  If 1. fails, it searches for a .csv file with the specified name in 
            the data directory, parses/converts the transaction data to .csv using
            the parse_transactions module, and returns the relative path of the
            resultant .json file after Parsing
        3.  If 1. and 2. fail, it returns the empty string as the datafile for 
            the front-end to handle.

       Note that Subsequent requests for data (e.g., in the form of XHR/AJAX requests)
       are expected to be made to the /update_data view.

       @param id        required, currently name of data file to find/pass to vis 
                        but could be encoded
       @param loop      optional, whether to loop (default) or keep requesting data. 
       @param maxpause  optional, max pause time, in ms, between txns
    """ 
    title    = "WePay transaction visualization"

    # If the page will loop on a single data file, or request more after the first
    # data are extinguished / animated
    loop         = request.args.get("loop") if request.args.get("loop") else "true"
    
    # Max pause time between transactions in ms. Deviates from reality but makes vis
    # more responsive to slider adjustments, etc.
    maxpause_ms  = int(request.args.get("maxpause")) if request.args.get("maxpause") else 1500 
    
    # File name parameter without file extension
    data_id      = request.args.get("id")
    data_relpath = get_datafile(data_id)
    
    # Initial count for transaction counter
    counter_start = int(request.args.get("ct")) if request.args.get("ct") else 0;   

    return render_template("customer.html", title=title, datafile=data_relpath,
                           loopbool_as_str=loop, maxpause_ms=maxpause_ms, 
                           callback_domain=CALLBACK_DOMAIN, 
                           counter_start=counter_start)

@app.route('/about')
def about(methods=["GET"]):
    """View for mockup of wepay.com About page. Similar to the lobby page 
       but does NOT include a counter element or variable.

       @param maxpause  optional, max pause time, in ms, between txns
    """ 
    title = "WePay: about"
    
    # encode some default file (yesterday, random, etc.)
    data_relpath = "%s/%s" % (REL_DATA_DIR, "sample-data_1k.json") 
    # maximum pause time between transactions
    maxpause_ms  = int(request.args.get("maxpause")) if request.args.get("maxpause") else 1500 

    return render_template("about.html", title=title, datafile=data_relpath, 
                           maxpause_ms=maxpause_ms)

@app.route('/lobby')
def lobby(methods=["GET"]):
    """View for mockup lobby display page. Differs from the about page view except 
       that it includes a counter variable and DOM element. 

       @param loop      optional, whether to loop (default) or keep requesting data. 
       @param maxpause  optional, max pause time, in ms, between txns
    """ 
    title = "WePay Transactions"

    # encode some default file (yesterday, random, etc.)
    data_relpath = "%s/%s" % (REL_DATA_DIR, "sample-data_1k.json") 
    # initial starting transaction count for vis counter
    counter_start = int(request.args.get("ct")) if request.args.get("ct") else 0;   
    # maximum pause time between transactions
    maxpause_ms  = int(request.args.get("maxpause")) if request.args.get("maxpause") else 1500 

    return render_template("lobby.html", title=title, datafile=data_relpath, 
                           counter_start=counter_start, maxpause_ms=maxpause_ms)

@app.route('/update_data')
def update_data(methods=["GET"]):
    """Handles requests for a new data file. Current implementation expects a 
       prev_datafile parameter which enables this controller to find a more recent 
       file if it exists in the directory, or to return the same file again for looping 
       if it cannot. The criteria for which data file is returned should be adjusted to
       WePay's needs, this is one possible route.

       The customer.html visualization will call this view if the loop parameter is not
       set to true (true by default). See wepay/util.js which makes this request.

       @param prev_datafile required, the last data file used by vis. Currently 
                            tries to find file newer than this, else returns same.
    """
    old_relpath     = new_relpath = request.args.get("prev_datafile")
    old_file        = os.path.split( old_relpath )[1] # remove path
    mostrecent_file = get_mostrecent_file(DATA_DIR,  "*.json") # try to find more recent file

    if old_file != mostrecent_file:
        new_relpath = "%s/%s" % (REL_DATA_DIR, mostrecent_file)

    return new_relpath

#..............................................................................
# Helper functions for views

def get_datafile(data_id):
    """Attempts to locate a file in the global DATA_DIR directory based on the
       data_id param. First trys to find a .json file matching the name. If it
       cannot, it tries .csv (and will eventually parse it and return the json),
       and if this fails it returns the empty string.
    """
    data_relpath  = ""
    json_fullpath = "%s/%s.json" % (DATA_DIR, data_id)
    json_relpath  = "%s/%s.json" % (REL_DATA_DIR, data_id)
    csv_fullpath  = "%s/%s.csv"  % (DATA_DIR, data_id)

    # first try to find a json version of the file (already parsed)
    if os.path.isfile(json_fullpath):
        data_relpath = json_relpath

    # next try to find a .csv version of the file (not yet parsed)
    elif os.path.isfile(csv_fullpath):
        print "Parsing transactions from %s, writing to %s" % (json_fullpath, csv_fullpath)
        
        TxnsPrsr.csv_to_parsedjson(csv_fullpath, outfile=json_fullpath)
        data_relpath = json_relpath

    else: # no luck
        print "%s/%s.json nor *.csv not found" % (DATA_DIR, data_id)
    
    return data_relpath

def get_mostrecent_file(directory, pattern):
    """Returns the filename of the most recently updated file in the passed
       directory, that matches the passed pattern, e.g., *.json
    """
    # Find all *.json files in the data directory, sort by most recently modified
    files = [ f for f in glob.glob(os.path.join(DATA_DIR, pattern)) ]
    files.sort(key=os.path.getmtime)

    if files:
        mostrecent_file = os.path.split( files[-1] )[1] # -1 = most recent
        return mostrecent_file
    else: 
        return "" # no match
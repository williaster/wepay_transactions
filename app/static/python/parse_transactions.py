#!/Users/christopherwilliams/dotfiles/virtualenvs/.virtualenvs/lighttable/bin/python
info="""Module for parsing WePay transactions, or can be used as a script to 
        do the same. Specific parsing steps include:
          
          - mapping payer/payee zip codes to longitude, latitude values 
            (which d3.js requires). 
          - annonymizing and minimizing data size for browser, output includes 
            only to/from coordinates and time.
          - parsed data is returned as JSON, typically as a file.
          - any data which have null entries for EITHER payer or payee zip codes,
            or payer or payee countries, are filtered. Currently the number of
            input and output transactions is printed after parsing.

          nb: Parsing requires the Pandas and argparse non-standard libraries.

        To use as a script, see python parse_transactions.py --help
        To use as module, use the csv_to_parsedjson(file_csv, outfile) function
        
        .......................................................................
        # Input
        When used as a script or module, an input .csv file of WePay data is
        expected. The input .csv file MUST contain the variables:
            capture_timestamp,       (eg 1412122952, in SECONDS since epoc) 
            payer_zip, payer_country,(eg 30076,US)
            payee_zip, payee_country (")

            notes on input:
              - Country variables are essential to correctly map zip codes to 
                lat-long
              - input does NOT need to be sorted
              - correctly handles US zip codes without a leading zero
              - correctly handles first 3 letters of CAN zip codes

        .......................................................................
        # Output
        Output of pasing is json, as a file or as an object. The following
        is example json output:
            [ { "time":1412207786000, 
                "to_coord":"[-77.0007,38.9832]",
                "from_coord":"[-75.4894,42.312]" },
              ... ]

            notes on output:
              - output is annonymized
              - output json is SORTED by increasing time. This is required for 
                the d3.js visualization
              - the coordinate arrays are [long, lat] NOT [lat, long].
              - the coordinate arrays are of type str, NOT arrays. They can 
                be evaluated in Python or JavaScript to coerce to arrays.

        Example input .csv files and output .json files can currently be found
        in app/static/data/txns
     """

__author__ = "christopher c williams for WePay"
__date__   = "2014-11"

import pandas as pd
import os

# GLOBAL variables for location of zip to latlong lookup table
PATH             = os.path.dirname( os.path.realpath(__file__) )
F_ZIP_TO_LATLONG = "%s/../data/allcountries_zip_to_latlong.txt" % PATH

#..............................................................................
# Helper functions

def get_txn_longlat(df_txns, df_zip_to_latlong):
    """Adds 'payee_coord' and 'payer_coord' cols to the df_txns DataFrame, 
       which correspond to the payee_zip and payer_zip cols. New cols take 
       the form of a string: '[longitude, latitude]'. Note that this is 
       flipped from the normal [lat,long] format, but more closely mirrors 
       [x,y] coordinates and is what d3.js expects. 
    """
    # Payer coords first, join to get payer coords
    df = pd.merge(df_txns, df_zip_to_latlong, 
                  left_on=["payer_zip", "payer_country"], 
                  right_on=["zip","country"], how="left")
    
    # remove rows for which lat/long values weren't found
    df.dropna(inplace=True, subset=["lat", "long"]) 
    
    # consolidate to single new column as string
    df.loc[:,"payer_coord"] = \
        "[" + df["long"].map(str) + "," + df["lat"].map(str) + "]"
    
    # drop join cols in prep for payee coords
    df.drop(["zip", "lat", "long", "country"], axis=1, inplace=True) 
    
    
    # Now payee coords
    df = pd.merge(df, df_zip_to_latlong, 
                  left_on=["payee_zip", "payee_country"], 
                  right_on=["zip","country"], how="left")
    df.dropna(inplace=True, subset=["lat", "long"]) 
    df.loc[:,"payee_coord"] = \
        "[" + df["long"].map(str) + "," + df["lat"].map(str) + "]"
    df.drop(["zip", "lat", "long", "country"], axis=1, inplace=True) 
    
    #print df
    return df

def truncate_CAN_zips(df):
    """Truncates CANADIAN zipcodes in payer_zip or payee_zip
       from 6 to the first 3 characters. MODIFIES the df that is
       passed in.
    """
    payer_trunc = [ zc[:3] for zc \
                    in df.loc[ df.payer_country == "CA", "payer_zip"] ]
    payee_trunc = [ zc[:3] for zc \
                    in df.loc[ df.payee_country == "CA", "payee_zip"] ]
    
    
    df.loc[ df.payee_country == "CA", "payee_zip" ] = payee_trunc
    df.loc[ df.payer_country == "CA", "payer_zip" ] = payer_trunc
    return df

def stringify_zips(df):
    """Converts zip code columns to strings to enable prepending zeros to
       (US) zip codes of the form "0XXXX", to matching with the zip codes 
       in the zip_to_latlong DataFrame. In addition to string coersion,
       prepends a 0 to any zip code that has a length of 4
    """
    prepend_zero = lambda z: str(z) if len(str(z)) != 4 else "0" + str(z)
    
    df.loc[:,"payer_zip"] = df["payer_zip"].map(prepend_zero)
    df.loc[:,"payee_zip"] = df["payee_zip"].map(prepend_zero)
    return df

def set_sec_to_ms(df):
	"""Converts the capture_timestamp from s to ms
	"""
	df.loc[:,"capture_timestamp"] = df["capture_timestamp"]*1000
	return df

def clean_df(df):
    """Removes un-needed columns from df, and siplifies col names to match the 
       json fields the visualization expects.

       Expects df to contain the columns:
       "capture_day", "capture_timestamp", "payee_coord", "payer_coord"
    """
    df = df.ix[:,["capture_timestamp", "payee_coord", "payer_coord"]]
    
    df.columns = ["time", "to_coord", "from_coord"] # rename for vis
    df.sort("time", inplace=True)

    return df

def parse_txns(df_txns, df_zip_to_latlong=None):
    """Wrapper function that:
         #1 filters transactions for null payer or payee zip codes
         #2 truncates CANADIAN zipcodes in df_txns to match df_zip_to_latlong
         #3 converts zip codes to strings to prepend 0s to len-4 zip codes
         #4 converts timestamp from s to ms since epoch
         #5 converts zip codes to long/lat values

       Will load df_zip_to_latlong if not passed.
    """
    if not df_zip_to_latlong:
    	df_zip_to_latlong = pd.read_table(F_ZIP_TO_LATLONG, 
    									  names=["country", "zip", "lat", "long"])
    	df_zip_to_latlong = df_zip_to_latlong.drop_duplicates()

    df = df_txns.dropna(subset=["payee_zip", "payee_country", 
                                "payer_zip", "payer_country"]) # need start/end zip
    df = truncate_CAN_zips(df) 
    df = stringify_zips(df)
    df = set_sec_to_ms(df) 
    df = get_txn_longlat(df, df_zip_to_latlong)
    df = clean_df(df)

    return df

def jsonify(df, outfile=None):
  """Converts the passed df to record-oriented json, and either writes the
	   result to file (action = "write") or returns it (action = "return").
  """
  if outfile:
    return df.to_json(outfile, orient="records")
  else:
    return df.to_json(orient="records")
	
def csv_to_parsedjson(file_csv, outfile=None):
  """Takes a csv filename as input, parses it, and either returns the data as
     json or writes json to the specified outfile (including path).
  """
  df_unparsed  = pd.read_csv( file_csv )
  df_parsed    = parse_txns( df_unparsed )

  return jsonify(df_parsed, outfile=outfile)


#..............................................................................
# Main, enables running this as a script with parameters. See
# python parse_transactions.py --help

def main():
	outfile = "%s_latlong.json" % args.out_base

	print "Parsing transactions from %s ..." % args.csv_file
	df_unparsed  = pd.read_csv(args.csv_file)
	df_parsed 	 = parse_txns( df_unparsed )
	unfilt_txns  = df_unparsed.shape[0]
	filt_txns    = df_parsed.shape[0]

	print "Writing (%i/%i) parsed transactions to %s" % (filt_txns, unfilt_txns, outfile)
	jsonify(df_parsed, action="write", outfile=outfile)


if __name__ == "__main__":
	
	import argparse
	prsr = argparse.ArgumentParser(description=info)
	prsr.add_argument("csv_file", type=str,
					  help="transactions .csv path and filename")
	prsr.add_argument("out_base", type=str, help="output directory + base " \
					  "filename for json output. _latlong.json is appended.")
	args = prsr.parse_args()
	main()
#!/Users/christopherwilliams/dotfiles/virtualenvs/.virtualenvs/lighttable/bin/python
info="""Module, or script, for parsing a *.csv file of transactions to map 
		payer/payee zip codes to latitude, longitude values which d3.js 
		requires. Provides methods for returning, or writing to file, 
     """

__author__ = "christopher c williams"
__date__   = "2014-11"

import pandas as pd

ZIP_TO_LATLONG = "../data/allcountries_zip_to_latlong.txt"

#..............................................................................
# helper functions

def get_lat_long(country, zipcode, df_zip_to_latlong):
	"""Given a country, zipcode, and pandas DataFrame containing returns a tuple of lat, long values 
	   corresponding to tha
	"""
	return

def get_df_zip_to_latlong(filename):
	"""Returns a pandas DataFrame constructued from the passed (dir+) filename.
	   Expected to contain countrycode\tzipcode\tlat\long
	"""
	return

# return value of data will need to be some type of json? 
#


#..............................................................................
# main
def main():
	return


if __name__ == "__main__":
	
	import argparse
	prsr = argparse.ArgumentParser(description=info)
	prsr.add_argument("csv_file", type=str,
					  help="transactions .csv path and filename")
	prsr.add_argument("out_file", type=str,
					  help="output directory + base filename (_latlong.json)")
	prsr.parse_args()
	main()
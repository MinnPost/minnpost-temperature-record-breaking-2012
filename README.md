# MN Temperature Records 2012

What temperature records were broken in 2012 in MN.

## Data

* [NOAA](https://mi3.ncdc.noaa.gov//mi3qry/search.cfm) for station coordinates.
* [PBS](http://www.pbs.org/newshour/widgets/temp-records/historical/year_records.html) for record data.

## Data Processing

Data was originally scraped from the PBS site here on [ScraperWiki](https://classic.scraperwiki.com/scrapers/broken_temperature_record_from_pbs/).

Since 2012 has passed, the scraper and data have been stored locally in this repo on 2013-08-26.

## Prerequisites

1. Install [Git](http://git-scm.com/).
1. Install [NodeJS](http://nodejs.org/).
1. Optionally, for development, install [Grunt](http://gruntjs.com/): `npm install -g grunt-cli`
1. Install [Bower](http://bower.io/): `npm install -g bower` 
1. Because Leaflet comes unbuilt, we need to build it with Jake: `npm install -g jake`

## Install

1. Check out this code with [Git](http://git-scm.com/): `git clone https://github.com/MinnPost/minnpost-usi-fiber.git`
1. Go into the template directory: `cd minnpost-usi-fiber`
1. Install NodeJS packages: `npm install`
1. Install Bower components: `bower install`
1. Because Leaflet comes unbuilt, we need to build it: `cd bower_components/leaflet/ && npm install && jake; cd -;`

## Development and Run Locally

* Run: `grunt server`
    * This will run a local webserver for development and you can view the application in your web browser at [http://localhost:8899](http://localhost:8899).
    * Utilize `index.html` for development, while `index-deploy.html` is used for the deployed version, and `index-build.html` is used to test the build before deployment.
    * The server runs `grunt watch` which will watch for linting JS files.  If you have your own webserver, feel free to use that with just this command.

## Build

1. Run: `grunt`

## Deploy

1. Run: `grunt mp-deploy`

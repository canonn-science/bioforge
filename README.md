# bioforge
 A web page for fetching statistical information about biology 

# credits
Thanks to cmdr KayeM for changing the background on the aninmated logo to make it transparent

# landing-page charts
With no search term, the landing page shows interactive charts built from `data/samples.json`.
That file is a condensed snapshot of the Canonn biostats API, produced by `python tools/build_samples_data.py`
(standard library only). A GitHub Action (`.github/workflows/build-samples.yml`) rebuilds and commits it whenever
something is pushed to `main`.

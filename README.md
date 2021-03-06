## IAO Peptide Reader

<!-- badges: start -->
[![R build status](https://github.com/hadexversum/IAOPeptideReader/workflows/R-CMD-check/badge.svg)](https://github.com/hadexversum/IAOPeptideReader/actions)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.en.html)
<!-- badges: end -->

This project started as a masters thesis at the [Faculty of Mathematics and Information Sciences](https://ww2.mini.pw.edu.pl) at the [Warsaw University of Technology](https://www.pw.edu.pl).

### Installation and Running the App
If one wishes to install the package it can be done as shown below.
```
# install.packages("remotes")
remotes::install_github("hadexversum/IAOPeptideReader")

IAOPeptideReader::run_shiny_app()
```

### Remarks
During the implementation following assumptions were made:

 * uploaded files have unique names,
 * the application will be started by `run_shiny_app` function, i.e. not directly with `shiny::runApp`.

### Shiny App Sourcing Summary
The table found below states which file sources which within the app. The main files with function returning UI and server function are respectively, `ui.R` and `server.R`.

| File Name                 | Sourced Files                                                              |
|---------------------------|----------------------------------------------------------------------------|
| `ui.R`                    | `ui/main_panel_ui.R`<br>`ui/sidebar_panel_ui.R`                            |
| `server.R`                | `server/input_settings.R`<br>`server/plot_settings.R`<br>`server/modals.R` |
| `server/input_settings.R` | `server/data_preview.R`                                                    |
| `server/modals.R`         | `server/modals/*.R`                                                        |

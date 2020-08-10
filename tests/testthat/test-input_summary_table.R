library(shiny)
library(stringi)

test_that("input_summary_row_ui function works", {

    input <- list(
       "input_id" = "abcd",
       "file_name" = "abcd",
       "is_ok" = TRUE
    )

    output_example <- "input_summary_row_ui_expected.html"

    output_expected <- readChar(output_example, file.info(output_example)$size)
    output_got <- input_summary_row_ui(input)

    expect_equal(stri_split_lines1(output_got), stri_split_lines1(output_expected))
})

test_that("input_summary_row_server function works", {

    input <- list(
       "input_id" = "abcd",
       "file_name" = "abcd",
       "is_ok" = TRUE
    )

    input_settings_rv <- shiny::reactiveValues(
      "fm" = list(), "obs" = list(), "data" = list(), "seq_max_len" = -Inf
    )
    
    expect_equal(length(input_summary_row_server(input, "", "", input_settings_rv)), 3)
})

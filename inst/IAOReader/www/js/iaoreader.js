let IAOReader = class {
    // Canvas dimensions.
    width = 1280; height = 720;
    margin = { top: 40, right: 35, bottom: 40, left: 35 };

    // Plot elements.
    svg; background; x_axis; y_axis; lines; title;
    vert; vert_click;

    // Vertical guides mark class names.
    vert_mark = "vert-mark"; vert_click_mark = "vert-click-mark";

    // Axis limits values and other variables.
    x_min = 1; x_max; vert_show; optimize_height; vertical_offset;
    color_palette; show_lambda_values; lambda_values_bg_color = "#FFFFFF";
    lambda_values_bg_invert; title_text; k_parameter; title_includes_k;
    ts_delta = 100; click_timestamp; drag_start_x; show_tooltip = true;
    // TODO: move show_tooltip to plot settings.

    // Data uploaded by the user.
    plot_data_raw = null; plot_data = null; file_names = null;
    file_names_displayed = new Map();

    constructor() {
        // Creating the SVG tag.
        this.svg = d3.select("div#plot").append("svg")
            .attr("viewBox", "0 0 " + this.width + " " + this.height);

        // Adding background rect.
        this.background = this.svg.append("g").append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("fill", "#ffffff");

        // Creating title.
        this.title = this.svg.append("text")
            .attr("id", "plot_title")
            .attr("text-anchor", "middle")
            .attr("x", "50%");

        // Creating X axis g tag.
        this.x_axis = this.svg.append("g")
            .attr("id", "x_axis")
            .attr("class", "axis")
            .attr("transform", "translate(0, " + (this.height - this.margin.bottom) + ")");

        // Creating Y axis g tag.
        this.y_axis = this.svg.append("g")
            .attr("id", "y_axis")
            .attr("class", "axis")
            .attr("transform", "translate(" + this.margin.left + ", 0)");

        // Creating lines g tag.
        this.lines = this.svg.append("g")
            .attr("id", "lines");

        // Creating g tag, line and label for mouseover vert.
        this.vert = this.svg.append("g")
            .attr("id", "vert")
            .attr("class", "verts");

        this.vert.append("line")
            .attr("y1", this.height - this.margin.bottom + 6)
            .attr("y2", this.margin.top)
            .style("stroke-width", 2)
            .style("stroke", "var(--plot-color-vert)");

        this.vert.append("rect")
            .attr("class", "axis-label")
            .style("fill", "white")
            .style("stroke", "var(--plot-color-vert)");

        this.vert.append("text")
            .attr("class", "axis-label")
            .attr("y", this.height - this.margin.bottom + 9)
            .attr("dy", "0.81em")
            .style("fill", "var(--plot-color-vert)");

        // Adding the tooltip g and it's text.
        this.tooltip = this.svg.append("g")
            .attr("id", "tooltip")
            .style("visibility", "hidden");

        this.tooltip.append("rect")
            .style("fill", "var(--theme-color-main)");

        this.tooltip.append("text")
            .attr("y", "15px")
            .style("fill", "var(--theme-color-bright-text)");

        // This mousemove handler makes the vertical guide follow the cursor.
        var self = this;
        this.svg.on("mousemove", function() {
            var m = d3.mouse(this),
                x = self.x_scale.invert(m[0]);

            if (self.mouse_out_of_bonds(m)) {
                self.unmark_lines(self.vert_mark);
                self.move_vert(self.vert, self.x_min);
                return;
            }

            if (self.vert_show) {
                self.mark_lines(x, self.vert_mark);
                self.move_vert(self.vert, x);
            }

            self.draw_tooltip(x, self.y_scale.invert(m[1]));
        })

        // This handler resets position of vert. This is particularly useful
        // for a case when user moves mouse outside the plot after pressing
        // mouse wheel and scrolling out.
        this.svg.on("mouseout", function() {
            if (!self.vert_show) return;

            // This check prevents tearing and lagging of the mousemove handler.
            if (!self.mouse_out_of_bonds(d3.mouse(this))) return;

            self.unmark_lines(self.vert_mark);
            self.move_vert(self.vert, self.x_min);

            self.lines.selectAll("line").style("stroke-width", 2);
            self.tooltip.style("visibility", "hidden");
        })

        // Creating g tag, line and label for click vert.
        this.vert_click = this.vert.clone(true)
            .attr("id", "vert_click")
            .style("visibility", "hidden");

        this.vert_click.select("line")
            .style("stroke", "var(--plot-color-vert-click)");

        this.vert_click.select("rect")
            .style("stroke", "var(--plot-color-vert-click)");

        this.vert_click.select("text")
            .style("fill", "var(--plot-color-vert-click)");

        // This handler creates persistent guide on click.
        this.svg.on("click", function() {
            var m = d3.mouse(this);
            if (self.mouse_out_of_bonds(m)) return;

            var x = self.x_scale.invert(m[0]);
            self.mark_lines(x, self.vert_click_mark);
            self.move_vert(self.vert_click, x);
            self.vert_click.style("visibility", "visible");
        })

        this.vert_drag_start = this.vert_click.clone(true)
            .attr("id", "vert_drag_start")
            .attr("class", "verts drag");

        this.vert_drag_start.select("line")
            .style("stroke", "var(--plot-color-vert-drag)");

        this.vert_drag_start.select("rect")
            .style("stroke", "var(--plot-color-vert-drag)");

        this.vert_drag_start.select("text")
            .style("fill", "var(--plot-color-vert-drag)");

        this.vert_drag_end = this.vert_drag_start.clone(true)
            .attr("id", "vert_drag_end")
            .style("fill", "var(--plot-color-vert-drag)");

        this.drag_background = this.svg.append("g").append("rect")
            .attr("id", "drag_background")
            .attr("class", "drag")
            .style("fill", "var(--plot-color-vert-drag)")
            .style("opacity", 0.2)
            .style("visibility", "hidden");

        // This is drag behavior definition which moves drag guides.
        var drag = d3.drag()
            // This handler saves current position in time. The time is then
            // verified within the drag handler. This approach has been
            // introduced to avoid moving drag verts on single click.
            .on("start", function() {
                var m = d3.mouse(this);
                if (self.mouse_out_of_bonds(m)) return;

                var x = self.x_scale.invert(m[0]);
                self.click_timestamp = Date.now();
                self.drag_start_x = x;
            })
            // Moves the end vert as well as the start vert to it's rightful
            // position. Only if <ts_delta>ms has passed since initial click.
            .on("drag", function() {
                if (Date.now() - self.click_timestamp < self.ts_delta) return;
                var m = d3.mouse(this);
                if (self.mouse_out_of_bonds(m)) return;

                var x = self.x_scale.invert(m[0]);
                if (self.drag_start_x === x) return;
                self.move_vert(self.vert_drag_start, self.drag_start_x, false);
                self.move_vert(self.vert_drag_end, x, true, self.drag_start_x);
                self.move_drag_rect(self.drag_start_x, x);
                self.svg.selectAll(".drag").style("visibility", "visible");
            })
            // This handler ensures that the end vert is placed correctly.
            .on("end", function() {
                if (Date.now() - self.click_timestamp < self.ts_delta) return;
                var m = d3.mouse(this);
                if (self.mouse_out_of_bonds(m)) return;

                var x = self.x_scale.invert(m[0]);
                if (self.drag_start_x === x) return;
                self.move_vert(self.vert_drag_end, x, true, self.drag_start_x);
                self.move_vert(self.vert, x);
                self.move_drag_rect(self.drag_start_x, x);
            });

        this.svg.call(drag);

        // This handler clears the persistent guide created on click.
        this.svg.on("dblclick", function() {
            var m = d3.mouse(this);

            if (self.mouse_out_of_bonds(m)) return;

            self.unmark_lines(self.vert_click_mark);
            self.vert_click.style("visibility", "hidden");
            self.svg.selectAll(".drag").style("visibility", "hidden");
        })

        this.vert_drag_end.raise();
        this.vert_click.raise();
        this.vert.raise();
        this.tooltip.raise();
    }

    /* -------------------------------------------------------------------------
     * Data handling
     * ---------------------------------------------------------------------- */

    // This function assumes that plot_data is a JSON with three fields: Start,
    // End, and FileName.
    update_plot_data(plot_data) {
        var file_names = [];

        this.plot_data_raw = d3.range(plot_data.Start.length).map(function(i) {
            var file_name = plot_data.FileName[i];

            if (file_name != plot_data.FileName[i - 1]) {
                file_names.push(file_name);
            }

            return {
                Start: plot_data.Start[i],
                End: plot_data.End[i],
                FileName: file_name
            }
        });

        this.file_names = file_names;
    }

    filter_data() {
        if (this.plot_data_raw === null) return null;

        var self = this;

        // Note: upper limit isn't inclusive due to lines starting at x_max
        //       were accounted for on Y axis but not actually displayed.
        this.plot_data = this.plot_data_raw
            .filter(d => (
                self.x_min <= d.Start && d.Start < self.x_max &&
                self.file_names_displayed.get(d.FileName))
            )
            .map(function(d, i) {
                d["y"] = i + 1;
                return d;
            });
    }

    set_file_visibility(file_name, display_flag) {
        this.file_names_displayed.set(file_name, display_flag);
    }

    adjust_heights() {
        if (this.plot_data === null) return null;

        var differences = this.height_differences;
        var disp_files = this.displayed_files;
        var self = this;

        this.plot_data = this.plot_data.map(function(d) {
            var offset = self.vertical_offset * disp_files.indexOf(d.FileName);
            d.y = d.y - differences[d.FileName] + offset;
            return d;
        });
    }

    lambda(n0) {
        return this.lambda_segment(n0, n0);
    }

    lambda_segment(n1, n2) {
        if (this.plot_data === null) return null;

        var disp_files = this.displayed_files;
        var files_data = new Map();

        // Transforming data into map of arrays.
        this.plot_data.forEach(function(d) {
            if (!disp_files.includes(d.FileName)) return;
            if (files_data[d.FileName] === undefined) {
                files_data[d.FileName] = new Array();
            }

            files_data[d.FileName] = files_data[d.FileName]
                .concat({Start: d.Start, End: d.End});
        });

        var results = new Map();
        for (const [k, v] of Object.entries(files_data)) {
            results[k] = lambda_segment(v, n1, n2, this.k_parameter);
        }

        return results;
    }

    calculate_summary_table() {
        var lambda_values = {};

        for (var i = this.x_min; i <= this.x_max; i++) {
            lambda_values[i] = this.lambda(i);
        }

        Shiny.setInputValue("summary_table", lambda_values);
    }


    /* -------------------------------------------------------------------------
     * Getters
     * ---------------------------------------------------------------------- */

    get x_scale() {
        return d3.scaleLinear()
            .domain([this.x_min, this.x_max])
            .range([this.margin.left, this.width - this.margin.right]);
    }

    get y_scale() {
        return d3.scaleLinear()
            .domain([1, this.y_max])
            .range([this.height - this.margin.bottom, this.margin.top]);
    }

    get displayed_files() {
        if (this.file_names === null) return [];

        var disp_files = [];
        var self = this;

        this.file_names.forEach(function(file_name) {
            if (self.file_names_displayed.get(file_name)) {
                disp_files.push(file_name);
            }
        });

        return disp_files;
    }

    get height_differences() {
        if (this.file_names === null || this.plot_data === null) return null;

        var disp_files = this.displayed_files;

        // Calculating y positions for every file for every X coordinate.
        var heights = new Map();

        // Initializing arrays.
        var n = this.x_max - this.x_min + 1
        disp_files.forEach(function(d) {
            heights[d] = new Map();
            heights[d]["Max"] = new Array(n).fill(-Infinity);
            heights[d]["Min"] = new Array(n).fill(Infinity);
        });

        // Reading both minimum and maximum Y axis value for every file.
        for (var i = 0; i < n; i++) {
            this.plot_data.forEach(function(d) {
                if (d.Start <= i && i <= d.End) {
                    heights[d.FileName]["Max"][i] = Math.max(d.y, heights[d.FileName]["Max"][i]);
                    heights[d.FileName]["Min"][i] = Math.min(d.y, heights[d.FileName]["Min"][i]);
                }
            });
        }

        // Calculating differences in height between files.
        var differences = new Map();
        differences[disp_files[0]] = 0;
        for (var i = 1; i < disp_files.length; i++) {
            var lower_values = heights[disp_files[i - 1]]["Max"];
            var higher_values = heights[disp_files[i]]["Min"];
            var diffs = new Array(n).fill(Infinity);

            for (var j = 0; j < n; j++) {
                if (Number.isFinite(lower_values[j]) && Number.isFinite(higher_values[j])) {
                    diffs[j] = higher_values[j] - lower_values[j];
                }
            }

            differences[disp_files[i]] = d3.min(diffs) + differences[disp_files[i - 1]];
        }

        return differences;
    }

    get y_max() {
        if (this.plot_data === null) return;
        return d3.max(this.plot_data.map(d => d.y));
    }


    /* -------------------------------------------------------------------------
     * Setters
     * ---------------------------------------------------------------------- */

    set vert_color(color) {
        document.documentElement.style.setProperty("--plot-color-vert", color);
    }

    set vert_click_color(color) {
        document.documentElement.style
            .setProperty("--plot-color-vert-click", color);
    }

    set vert_drag_color(color) {
        document.documentElement.style
            .setProperty("--plot-color-vert-drag", color);
    }

    set background_color(color) {
        this.background.style("fill", color);
    }

    set axes_color(color) {
        document.documentElement.style.setProperty("--plot-color-axes", color);
    }

    set axes_labels_color(color) {
        document.documentElement.style
            .setProperty("--plot-color-axes-labels", color);
    }

    set axes_labels_font_size(size) {
        this.x_axis.selectAll("text").attr("font-size", size + "px");
        d3.selectAll("g.verts text.axis-label")
            .attr("font-size", size + "px");
    }

    set title_font_size(size) {
        // This makes the title centered at the initial y.
        this.title.attr("y", this.margin.top * 0.60 + (size - 20) / 2 + "px");
        this.title.attr("font-size", size + "px");
    }

    set title_color(color) {
        this.title.attr("fill", color);
    }

    set lambda_values_bg(color) {
        this.lambda_values_bg_color = color;
        this.svg.selectAll("rect.lambda")
            .style("fill", color);
    }


    /* -------------------------------------------------------------------------
     * Drawing plot elements
     * ---------------------------------------------------------------------- */

    update_plot() {
        // This check is performed because some handlers call the update_plot
        // method before the data is uploaded.
        if (this.plot_data_raw === null) return;

        this.filter_data();

        if (this.optimize_height) {
            this.adjust_heights();
        }

        this.draw_x_axis();
        this.draw_y_axis();
        this.draw_lines();

        // Resetting verts to their default states.
        this.unmark_lines(this.vert_mark);
        this.move_vert(this.vert, this.x_min);

        this.unmark_lines(this.vert_click_mark);
        this.vert_click.style("visibility", "hidden");

        this.calculate_summary_table();
    }

    draw_x_axis() {
        this.x_axis.call(d3.axisBottom().scale(this.x_scale));
    }

    draw_y_axis() {
        this.y_axis.call(d3.axisLeft().scale(this.y_scale));
        this.y_axis.selectAll("g.tick").remove();
    }

    draw_lines() {
        // Note: max and min functions trim the line to not extend over
        //       the plots edge into the margin.
        this.lines
            .selectAll("line")
                .data(this.plot_data)
                .join("line")
                    .attr("x1", d => this.x_scale(Math.max(d.Start, this.x_min)))
                    .attr("y1", d => this.y_scale(d.y))
                    .attr("x2", d => this.x_scale(Math.min(d.End, this.x_max)))
                    .attr("y2", d => this.y_scale(d.y))
                    .style("stroke-width", 2)
                    .style("stroke", d => this.file_color(d.FileName));
    }

    draw_lambda_values(vert, x1, top_placement, x2, horizontal_padding = 3) {
        if (this.plot_data === null) return;

        vert.selectAll(".lambda").remove();
        if (!this.show_lambda_values) return;

        var n1 = Math.min(x1, x2),
            n2 = Math.max(x1, x2);

        var disp_files = this.displayed_files;
        var comparison_func = top_placement ? Math.max : Math.min;

        // Getting highest line at given point for every file.
        var heights = new Map();
        this.plot_data.forEach(function(d) {
            if (!disp_files.includes(d.FileName)) return;
            if (d.End < n1 || n2 < d.Start) return;
            if (heights[d.FileName] === undefined) {
                heights[d.FileName] = top_placement ? -Infinity : Infinity;
            }

            heights[d.FileName] = comparison_func(d.y, heights[d.FileName]);
        });

        // Calculating lambda values.
        var lambda_values = this.lambda_segment(n1, n2);

        // Adding new values to the vert.
        for (var [file_name, y] of Object.entries(heights)) {
            var lambda_val = Math.round(lambda_values[file_name] * 100);
            if (isNaN(lambda_val)) continue;

            var x = 13 + 4 * lambda_val.toString().length + horizontal_padding,
                x = top_placement ? -x : x;
            var y = this.y_scale(y) + (top_placement ? -11 : 20);

            // Segment measure variant.
            if (x1 !== x2) {
                x = (this.x_scale(x2) - this.x_scale(x1)) / 2;
            }

            var rect = vert.append("rect")
                .attr("class", "lambda")
                .style("fill", this.lambda_values_bg_color)
                .style("filter", "invert(" + +this.lambda_values_bg_invert + ")");

            var text = vert.append("text")
                .attr("class", "lambda")
                .attr("x", x)
                .attr("y", y)
                .attr("fill", this.file_color(file_name))
                .text(lambda_val + "%");

            this.draw_text_bbox(text, rect);

            // If the background box moves below X-axis then move it sideways
            // in order to not obstruct axis label.
            var rect_lower_limit = +rect.attr("y") + +rect.attr("height");
            if (x1 === x2 && this.y_scale.invert(rect_lower_limit) < 0) {
                var x_adj = vert.select("rect.axis-label").attr("width") / 2;
                text.attr("x", x + (top_placement ? -x_adj : x_adj));
                this.draw_text_bbox(text, rect);
            }
        }
    }

    draw_text_bbox(text_element, rect_element, padding = 6) {
        var bbox = text_element.node().getBBox();

        rect_element
            .attr("x", bbox.x - padding / 2)
            .attr("y", bbox.y - padding / 2)
            .attr("height", bbox.height + padding)
            .attr("width", bbox.width + padding)
            .attr("rx", padding / 2);
    }

    draw_plot_title() {
        var title_text = this.title_text;

        if (this.title_includes_k) {
            title_text += " (k = " + this.k_parameter + ")";
        }

        this.title.text(title_text);
    }

    draw_tooltip(mouse_x, mouse_y, proximity_threshold = 0.4) {
        var x = Math.round(mouse_x),
            y = Math.round(mouse_y);

        var all_lines = this.lines.selectAll("line");
        all_lines.style("stroke-width", 2);

        var lines = all_lines.filter(d => d.Start <= x && x <= d.End);

        if (lines.empty()) return;
        var lines_data = lines.data();

        // Retrieving data of the closest line to the cursor.
        var line_dists = lines_data.map(line => Math.abs(line.y - mouse_y)),
            min_dist = d3.min(line_dists);

        // Hiding the tooltip so that it effectively gets removed if the
        // distance from closest line is above the proximity threshold.
        this.tooltip.style("visibility", "hidden");
        if (min_dist > proximity_threshold) return;

        var closest_line = lines_data[line_dists.indexOf(min_dist)];

        // Bolding the line which has it's information displayed.
        lines.filter(d => (
            d.Start == closest_line.Start &&
            d.End == closest_line.End &&
            d.FileName == closest_line.FileName &&
            d.y == closest_line.y
        )).style("stroke-width", 4);

        var x_offset = "10px",
            tooltip_text = ""
                + "<tspan class='name' x='" + x_offset + "' dy='1.2em'>File</tspan>  "
                + closest_line.FileName
                + "<tspan class='name' x='" + x_offset + "' dy='1.2em'>Start</tspan> "
                + closest_line.Start
                + "<tspan class='name' x='" + x_offset + "' dy='1.2em'>End</tspan>   "
                + closest_line.End;

        var tooltip_text = this.tooltip
            .attr("transform", "translate(" + this.x_scale(x) + ", " +
                this.y_scale(y) + ")")
            .style("visibility", "visible")
            .select("text")
                .html(tooltip_text);

        this.draw_text_bbox(tooltip_text, this.tooltip.select("rect"), 12);
    }


    /* -------------------------------------------------------------------------
     * Lines coloring
     * ---------------------------------------------------------------------- */

    mark_lines(x_dest, class_name, remove = false) {
        var lines = this.lines.selectAll("line");

        lines.nodes().forEach(d => d.classList.remove(class_name));

        if (!remove) {
            // This round makes the guide snap to integer values on the axis.
            var x = Math.round(x_dest);

            lines.filter(d => d.Start <= x && x <= d.End).nodes()
                .forEach(d => d.classList.add(class_name));
        }
    }

    unmark_lines(class_name) {
        this.mark_lines(null, class_name, true);
    }

    file_color(file_name) {
        var color_id = this.displayed_files.indexOf(file_name);

        // This assures the function will work properly even if file with
        // provided file_name is currently not displayed.
        if (color_id == -1) return "black";

        var col_pal = this.color_palette;

        return col_pal[color_id % col_pal.length];
    }


    /* -------------------------------------------------------------------------
     * Vertical guides handling
     * ---------------------------------------------------------------------- */

    mouse_out_of_bonds(m) {
        return (m[0] < this.margin.left || m[0] > this.width - this.margin.right ||
                m[1] < this.margin.top || m[1] > this.height - this.margin.bottom)
    }

    move_vert(vert, x1, draw_values = true, x2 = x1) {
        // This round makes the guide snap to integer values on the axis.
        x1 = Math.round(x1);
        x2 = Math.round(x2);

        vert
            .attr("transform", "translate(" + this.x_scale(x1) + ", 0)")
            .select("text.axis-label")
                .text(x1);

        // Drawing a box around the label.
        this.draw_text_bbox(
            vert.select("text.axis-label"), vert.select("rect.axis-label"), 3);

        // Mouseover vert uses the top placement.
        if (draw_values) {
            var top_placement = vert == this.vert || vert == this.vert_drag_end;
            this.draw_lambda_values(vert, x1, top_placement, x2);
        }
    }

    redraw_vert(vert) {
        var transform_value = vert.attr("transform");

        // Check to avoid errors if vert was not used at least once.
        if (transform_value === null) return;

        var vert_px_position = +transform_value
            .replace("translate(", "").split(",")[0];

        // This moves vert to it's current position to redraw lambda values.
        var x1 = this.x_scale.invert(vert_px_position),
            x2 = vert == this.vert_drag_end ? this.drag_start_x : x1;
        this.move_vert(vert, x1, true, x2);
    }

    move_drag_rect(x1, x2) {
        var x1 = this.x_scale(Math.round(x1)), x2 = this.x_scale(Math.round(x2)),
            y1 = this.y_scale(1), y2 = this.y_scale(this.y_max),
            width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);

        this.drag_background
            .attr("x", Math.min(x1, x2))
            .attr("y", Math.min(y1, y2))
            .attr("width", width)
            .attr("height", height);
    }


    /* -------------------------------------------------------------------------
     * Downloading plot as SVG
     * ---------------------------------------------------------------------- */

    download_svg() {
        download_svg_node(this.svg.node());
    }
}


// This variable's value is assigned by Shiny main server function.
var iaoreader;

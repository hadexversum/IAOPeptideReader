Shiny.addCustomMessageHandler("initialize_iaoreader", function(_) {
    iaoreader = new IAOReader();
});


Shiny.addCustomMessageHandler("update_seq_len", function(seq_len) {
    iaoreader.x_max = seq_len;
    iaoreader.update_plot();
});


Shiny.addCustomMessageHandler("update_data", function(plot_data) {
    var color_id = 0;

    iaoreader.plot_data_raw = d3.range(plot_data.Start.length).map(i => (
        {
            Start: plot_data.Start[i],
            End: plot_data.End[i],
            FileName: plot_data.FileName[i],
            ColorId: plot_data.FileName[i] != plot_data.FileName[i - 1] ? ++color_id : color_id,
            y: i + 1
        }
    ));

    iaoreader.update_plot();
});


Shiny.addCustomMessageHandler("seq_len_check", function(is_ok) {
    var seq_len_input = document.getElementById("sequence_length");

    if (is_ok) {
        seq_len_input.removeAttribute("is_wrong");
    } else {
        seq_len_input.setAttribute("is_wrong", "");
    }
});


/* -----------------------------------------------------------------------------
 * Plot settings
 * -------------------------------------------------------------------------- */

// [[ Plot title ]]
Shiny.addCustomMessageHandler("plot_settings_title_text", function(title_text) {
    iaoreader.plot_settings.title.text(title_text);
});


// [[ Vertical guide ]]
Shiny.addCustomMessageHandler("plot_settings_vert_show", function(vert_show) {
    // vert_show attribute is tracked by the mousemove handler.
    iaoreader.vert_show = vert_show;
    iaoreader.vert.style("visibility", vert_show ? "visible" : "hidden");
    iaoreader.unmark_lines("vert-mark");
});

Shiny.addCustomMessageHandler("plot_settings_allow_verts_marking", function(allow_marking) {
    var cl = iaoreader.lines.node().classList;

    if (allow_marking) {
        cl.add("allow-verts-marking");
        return
    }

    cl.remove("allow-verts-marking");
});

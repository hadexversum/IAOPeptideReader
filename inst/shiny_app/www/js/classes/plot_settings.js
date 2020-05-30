let PlotSettings = class {
    // Plot elements.
    svg; title;

    constructor(svg, margin) {
        this.svg = svg;

        // Creating title.
        this.title = this.svg.append("text")
            .attr("id", "plot_title")
            .attr("text-anchor", "middle")
            .attr("x", "50%")
            .attr("y", margin.top / 2 + "px");
    }
}

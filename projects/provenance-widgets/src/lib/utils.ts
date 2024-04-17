import * as d3 from "d3"

export function convertRemToPixels(rem: number) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export function interpolateLightOranges(d: number) {
    return d3.interpolateOranges(d/2)
}

export function suffixed(n: number) {
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) {
        return n + "st";
    }
    if (j === 2 && k !== 12) {
        return n + "nd";
    }
    if (j === 3 && k !== 13) {
        return n + "rd";
    }
    return n + "th";
}

export function getTooltip() {
    let tooltip = d3.select<HTMLDivElement, unknown>("#provenance-widgets-tooltip")

    if (!tooltip.empty()) {
        return tooltip
    }

    tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "provenance-widgets-tooltip")
        .style("position", "fixed")
        .style("z-index", "2000")
        .style("background-color", "var(--surface-100)")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("display", "none")
        .style("opacity", 0)
        .style("width", "max-content")

    // append close button
    tooltip
        .append("button")
        .style("position", "absolute")
        .style("top", "-5px")
        .style("right", "-5px")
        .style("background-color", "var(--surface-300)")
        .style("border", "none", "important")
        .style("border-radius", "20px")
        .style("cursor", "pointer")
        .text("x")
        .on("click", () => {
            tooltip.style("display", "none")
            tooltip.style("opacity", 0)
        })

    // append content div
    tooltip.append("div")

    return tooltip
}
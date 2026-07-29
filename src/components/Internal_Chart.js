import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import useProvenance from './hooks/useProvenance.js';

const transformData = (detail) => {
    const obj = Object.fromEntries(detail.entries())
    const keys = Object.keys(obj)
    const extractedData = []
    for (let key of keys) {
        for (let i = 0; i < detail.get(key).length; i++) {
            const el = detail.get(key)[i];
            extractedData.push({ ...el, key })
        }
    }
    return extractedData.sort((a, b) => a.index - b.index)
}

const Internal_Chart = ({ prov }) => {
    const chartRef = useRef(null);
    const [registeredComponents] = useProvenance();
    const [labelWidth, setLabelWidth] = useState(0);
    const [labels, setLabels] = useState([]);

    // Extract labels from prov data
    useEffect(() => {
        if (prov) {
            const rComps = prov.registeredWidgets;
            const extractedLabels = Object.keys(Object.fromEntries(rComps.entries()));
            setLabels(extractedLabels);
        }
    }, [prov]);

    // Calculate label widths
    useEffect(() => {
        if (labels.length === 0) return;

        const tempSvg = d3.select('body').append('svg')
            .style('visibility', 'hidden')
            .style('position', 'absolute')
            .style('top', '0')
            .style('left', '0');

        const tempText = tempSvg.selectAll('.temp-text')
            .data(labels)
            .enter()
            .append('text')
            .text(d => d)
            .style('font-size', '12px')
            .style('font-family', 'sans-serif');

        const maxLabelWidth = d3.max(tempText.nodes(), node => node.getBBox().width);
        console.log("Max label width:", maxLabelWidth);
        tempSvg.remove();

        setLabelWidth(maxLabelWidth);
    }, [labels]);

    // Draw chart
    useEffect(() => {
        if (!prov || labels.length === 0 || labelWidth === 0) return;

        // Clear previous SVG/chart before drawing new one
        if (chartRef.current) {
            d3.select(chartRef.current).selectAll("*").remove();
        }

        // Calculate dynamic margins based on label width
        const baseMargin = { top: 20, right: 20, bottom: 40, left: 50 };
        const dynamicLeftMargin = Math.max(baseMargin.left, labelWidth + 2); // Add 20px padding

        const margin = {
            ...baseMargin,
            left: dynamicLeftMargin
        };

        const width = 400 - margin.left - margin.right;
        const height = 250 - margin.top - margin.bottom;

        const rComps = prov.registeredWidgets;
        const xDomain = prov.domain.get("index");
        const lastIndex = xDomain.length - 1;

        // Declare scales
        const x = d3.scaleLinear()
            .domain([xDomain[0], xDomain[lastIndex]])
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(Object.keys(Object.fromEntries(rComps.entries())))
            .range([0, height])
            .padding(0.1);

        // Create the SVG container
        const svg = d3
            .select(chartRef.current)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Add the x-axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add the y-axis with proper positioning
        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.5em");

        // Add rectangles
        const data = transformData(prov.detailedData);

        svg.selectAll("rect")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", d => {
                if (d.start !== undefined) {
                    return x(d.start);
                }
                return x(d.index) - 10; // Center single points
            })
            .attr("y", d => y(d.key))
            .attr("width", d => {
                if (d.end && d.start !== undefined) {
                    const width = x(d.end) - x(d.start);
                    return Math.max(width, 1); // Ensure minimum width
                }
                return 20; // Default width for single values
            })
            .attr("height", y.bandwidth())
            .attr("fill", "steelblue")
            .attr("rx", 2)
            .attr("ry", 2);

    }, [prov, labels, labelWidth]);

    return <div ref={chartRef} className="sequence-chart"></div>;
};

export default Internal_Chart;
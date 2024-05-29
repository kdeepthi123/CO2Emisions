// Load CSV and GeoJSON data using Promise.all
Promise.all([
  d3.csv("data/GlobalLandTemperaturesByCountry.csv"),
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
]).then(([csvData, geoData]) => {
  // Parse year from the 'dt' column and create a new field
  csvData.forEach(d => d.year = new Date(d.dt).getFullYear());

  // Aggregate data to find average temperatures per country and year
  const avgTemps = d3.rollup(
    csvData,
    (v) => d3.mean(v, (d) => +d.AverageTemperature),
    (d) => d.year,
    (d) => d.Country
  );

  // Initialize to a specific year, like 2000
  const initialYear = 2000;
  const countryData = Array.from(avgTemps.get(initialYear), ([country, temp]) => ({ country, temp }));

  // Log processed data for debugging purposes
  console.log("Aggregated Temperature Data for Year:", initialYear, countryData);
  console.log("Loaded GeoJSON data:", geoData);

  // Draw initial map
  drawWorldMap(countryData, geoData);

  // Set up year slider
  setupYearSlider(Array.from(avgTemps.keys()).sort(), avgTemps, geoData);
}).catch((error) => {
  console.error("Error loading data:", error);
});

// Define a global color scale for temperature mapping
const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([40, -10]);

// Function to draw the world map
function drawWorldMap(data, geoData) {
  const width = 1200, height = 800;
  const projection = d3.geoEquirectangular().scale([width / (2 * Math.PI)]).translate([width / 2, height / 2]);
  const geoPath = d3.geoPath().projection(projection);
  
  // Clear the previous SVG to allow redrawing
  d3.select('#map_chart').selectAll('svg').remove();

  // Create the SVG container
  const svg = d3.select('#map_chart').append('svg')
    .attr('width', width)
    .attr('height', height);

  // Add map paths and colors based on temperature data
  svg.selectAll('path')
    .data(geoData.features)
    .enter().append('path')
    .attr('d', geoPath)
    .attr('fill', (d) => {
      const countryName = d.properties.name;
      const tempData = data.find((c) => c.country === countryName);
      return tempData ? colorScale(tempData.temp) : '#ccc';
    })
    .attr('stroke', 'white')
    .attr('stroke-width', 0.5)
    .on('mousemove', (event, d) => {
      const countryName = d.properties.name;
      const temp = data.find((c) => c.country === countryName)?.temp || 'No data';
      showTooltip(event.pageX, event.pageY, `${countryName}: ${temp}°C`);
    })
    .on('mouseleave', hideTooltip);
}

// Function to set up the year slider
function setupYearSlider(years, avgTemps, geoData) {
  const slider = d3.select("#year-slider");
  slider
    .attr("min", years[0])
    .attr("max", years[years.length - 1])
    .attr("value", years[0])
    .on("input", function() {
      const year = parseInt(this.value);
      const newData = Array.from(avgTemps.get(year), ([country, temp]) => ({ country, temp }));
      drawWorldMap(newData, geoData);
    });
}



// Tooltip functions
function showTooltip(x, y, content) {
  d3.select('#tooltip')
    .style('left', `${x + 10}px`) // Offset for better visibility
    .style('top', `${y + 10}px`)
    .style('display', 'block')
    .html(content);
}

function hideTooltip() {
  d3.select('#tooltip').style('display', 'none');
}


function drawTemperatureLineChart(csvFilePath) {
  d3.csv(csvFilePath).then((rawData) => {
    // Parse the data and convert to a usable format
    const data = rawData.map(d => ({
      year: new Date(d.dt).getFullYear(),
      temperature: +d.AverageTemperature
    }));

    // Group data by year and compute the average temperature per year
    const groupedData = d3.rollup(
      data,
      v => d3.mean(v, d => d.temperature),
      d => d.year
    );

    // Convert to an array format suitable for D3
    const processedData = Array.from(groupedData, ([year, temperature]) => ({ year, temperature }));

    // Set up chart dimensions
    const margin = { top: 20, right: 30, bottom: 50, left: 60 },
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    // Clear previous SVG content and create the SVG container
    const svgContainer = d3.select("#line_chart");
    svgContainer.selectAll('*').remove();

    const svg = svgContainer
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleLinear()
      .domain(d3.extent(processedData, d => d.year))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([d3.min(processedData, d => d.temperature) - 1, d3.max(processedData, d => d.temperature) + 1])
      .range([height, 0]);

    // Create and add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(processedData.length / 10));

    // Create and add Y axis
    svg.append("g")
      .call(d3.axisLeft(y));

    // Create the line path
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.temperature));

    // Draw the line
    svg.append("path")
      .datum(processedData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Tooltip setup
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border-radius", "5px")
      .style("padding", "5px")
      .style("text-align", "center")
      .style("border", "1px solid #ddd");

    // Invisible overlay for tooltip
    svg.selectAll(".overlay")
      .data(processedData)
      .enter().append("rect")
      .attr("x", (d, i) => x(d.year) - (i < processedData.length - 1 ? (x(processedData[i + 1].year) - x(d.year)) / 2 : 0))
      .attr("y", 0)
      .attr("width", (d, i) => i < processedData.length - 1 ? (x(processedData[i + 1].year) - x(d.year)) : x.range()[1] - x(d.year))
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", function(event, d) {
        tooltip.transition()
          .duration(200)
          .style("opacity", 1);
        tooltip.html(`Year: ${d.year}<br/>Temperature: ${d.temperature.toFixed(2)}°C`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  }).catch(error => {
    console.error("Error loading or processing data:", error);
  });
}

// Call the function to draw the line chart with your CSV file path
drawTemperatureLineChart("data/GlobalLandTemperaturesByCountry.csv");


// Call the function to draw the line chart with your CSV file path
drawTemperatureLineChart("data/GlobalLandTemperaturesByCountry.csv");

function drawTemperatureScatterLineChart(csvFilePath) {
  d3.csv(csvFilePath).then((data) => {
    // Parse the data
    const parsedData = data.map(d => ({
      year: new Date(d.dt).getFullYear(),
      temperature: +d.AverageTemperature
    }));

    // Group data by year and calculate average temperature per year
    const summaryData = Array.from(
      d3.group(parsedData, d => d.year),
      ([key, value]) => ({ year: key, avgTemp: d3.mean(value, v => v.temperature) })
    );

    // Set up chart dimensions
    const margin = { top: 20, right: 20, bottom: 40, left: 50 },
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    // Append SVG object to the body of the page
    const svg = d3.select("#scatterplot").html("")  // Clear any existing content
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add X axis
    const x = d3.scaleLinear()
      .domain(d3.extent(summaryData, d => d.year))
      .range([ 0, width ]);
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([d3.min(summaryData, d => d.avgTemp), d3.max(summaryData, d => d.avgTemp)])
      .range([ height, 0 ]);
    svg.append("g")
      .call(d3.axisLeft(y));

    // Define the line path generator
    const lineGenerator = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.avgTemp))
      .curve(d3.curveMonotoneX); // This makes the line smoother

    // Add line with animation
    const path = svg.append("path")
      .datum(summaryData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", lineGenerator);

    // Calculate total length of the path
    const totalLength = path.node().getTotalLength();

    path.attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(4000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    // Add dots with delay to match line drawing
    svg.selectAll("dot")
      .data(summaryData)
      .enter()
      .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.avgTemp))
        .attr("r", 0)
        .style("fill", "#69b3a2")
      .transition()
        .delay((d, i) => i * (4000 / summaryData.length)) // This delays each dot to appear sequentially
        .duration(500)
        .attr("r", 5);

    // Tooltips
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("text-align", "center")
      .style("width", "120px")
      .style("padding", "5px")
      .style("background", "lightsteelblue")
      .style("border-radius", "5px")
      .style("color", "white");

    svg.selectAll("circle")
      .on("mouseover", function(event, d) {
        tooltip.transition()
          .duration(200)
          .style("opacity", 1);
        tooltip.html(`Year: ${d.year}<br>Temperature: ${d.avgTemp.toFixed(2)}°C`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  }).catch(error => {
    console.error("Error loading or processing data:", error);
  });
}

// Make sure to provide the correct CSV file path
drawTemperatureScatterLineChart("data/Barchart_data.csv");



function drawTemperatureBarChart(csvFilePath) {
  d3.csv(csvFilePath).then((rawData) => {
    // Extract unique countries from the dataset
    const countries = Array.from(new Set(rawData.map(d => d.Country)));

    // Populate the country dropdown
    const select = d3.select("#countrySelect");
    select.selectAll("option")
      .data(countries)
      .enter()
      .append("option")
      .text(d => d);

    // Initial data filtering for the first country
    updateBarChart(countries[0]);

    // Dropdown change event listener
    select.on("change", function(event) {
      updateBarChart(this.value);
    });

    function updateBarChart(country) {
      const filteredData = rawData.filter(d => d.Country === country);

      // Group data every 50 years
      const processedData = d3.rollups(filteredData, 
        v => d3.mean(v, d => +d.AverageTemperature), 
        d => Math.floor(new Date(d.dt).getFullYear() / 50) * 50)
        .map(([year, temperature]) => ({ year, temperature }));

      // Chart setup
      const margin = { top: 20, right: 30, bottom: 70, left: 60 },
            width = 960 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

      // Clear previous SVG
      const svg = d3.select("#bar_chart").html("")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand()
        .domain(processedData.map(d => d.year))
        .range([0, width])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.temperature)])
        .range([height, 0]);

      svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y));

      // Tooltip setup
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "lightsteelblue")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("color", "white")
        .style("display", "none");

      svg.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.year))
        .attr("y", d => y(d.temperature))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.temperature))
        .attr("fill", "steelblue")
        .on("mouseover", function(event, d) {
          tooltip.transition()
            .duration(200)
            .style("opacity", 1)
            .style("display", "block");
          tooltip.html(`Year: ${d.year}<br/>Temperature: ${d.temperature.toFixed(2)}°C`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function(event, d) {
          tooltip.style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(d) {
          tooltip.transition()
            .duration(500)
            .style("opacity", 0)
            .style("display", "none");
        });
    }
  }).catch(error => {
    console.error("Error loading or processing data:", error);
  });
}

// Call the function to draw the bar chart with your CSV file path
drawTemperatureBarChart("data/Barchart_data.csv");



//-----------------------------SVG-------------------------------//

var margin = {top: 50, right: 50, bottom: 50, left: 60}
  , width = window.innerWidth - margin.left*2 - margin.right*2.5 // Use the window's width
  , height = 1200;

// add SVG
var svg = d3.select("#container").append("svg")
    .attr("width", width + margin.left*2 + margin.right*2)
    .attr("height", height )
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top * 2 + ")");


var all_nodes = {};

var nodes = {};

var all_links = [];

var filtered_links = [];

var curr_filtered_links = [];

const highlight_node_count = 10;

const text_space_scale = 20;

const node_shrink_scale = 900;

// add the options to the button
var gender_options = ["All", "M", "F"];

var party_options = ["All", "R", "D", "L", "I"];

var topic_options = ["All", "house", "trump", "health", "bill", "congress", "americans", "care", "president", "act"];

var curr_gender = "All";

var curr_party = "All";

var curr_topic = "All";

// set up dropdowns
d3.select("#gender")
  .selectAll('myOptions')
  .data(gender_options)
  .enter()
  .append('option')
  .text(function (d) { return d; }) // text showed in the menu
  .attr("value", function (d) { return d; }) // corresponding value returned by the button


d3.select("#party")
  .selectAll('myOptions')
  .data(party_options)
  .enter()
  .append('option')
  .text(function (d) { return d; }) // text showed in the menu
  .attr("value", function (d) { return d; })


d3.select("#topic")
  .selectAll('myOptions')
  .data(topic_options)
  .enter()
  .append('option')
  .text(function (d) { return d; }) // text showed in the menu
  .attr("value", function (d) { return d; })


var tooltip = d3.tip()
            .attr("class", "d3-tip")
            .offset([-5, 10])
            .html(function(d) {
              return "<strong>Name: </strong><span class='details'>" + d.name
              +"<br></span>" + "<strong>Party: </strong><span class='details'>" + d.party + "</span>"
              +"<br></span>" + "<strong>Most common topic: </strong><span class='details'>" + d.topic +"</span>"
              +"<br></span>" + "<strong># Tweets about the topic: </strong><span class='details'>" + d.tp_tweet_count +"</span>"
              +"<br></span>" + "<strong>Total Interactions: </strong><span class='details'>" +d.total_interaction + "</span>"
              ;
            })
            ;
svg.call(tooltip);

//-----------------------------DATA------------------------------//
dataset = d3.csv("data/house_edges_final.csv");
//nest the datasets and combine to add a filter by gender, party, etc.
dataset_metadata = d3.csv("data/hashtags_mentions_retweets.csv");
dataset_topics = d3.csv("data/all_tweets_by_topic.csv");

dataset_metadata.then(function(data) {
  var metadata = data.map(function(d) {
      return {
          rowid: +d.rowid,
          tweet_screen_name: d.tweet_screen_name,
          gender: d.gender,
          party: d.party,
          retweet_count: +d.retweet_count,
          mentions_count: +d.mentions_count,
          hashtags_count: +d.hashtags_count,
          total_interaction: +d.Total_Interaction
          }
      });
  dataset_topics.then(function(data) {
      var data_tp = data.map(function(d) {
          return {
              row: +d.row,
              name: d.name,
              topic: d.topic,
              party: d.party,
              gender: d.gender,
              tweet_count: +d.tweet_count
              }
          });

      dataset.then(function(data) {
      var data_r = data.map(function(d) {
          return {
              rep_a: d.rep_a,
              rep_b: d.rep_b
              }
          });

      var links = data;

      var weights = []; // array to save weights/degrees

      var prolific_weights = []; //array to save total_interaction degrees

      var most_influential_congress = [];

      var most_influential_congress_handles = [];

      // compute the source and target nodes for the links
      links.forEach(function(link) {
          link.source = nodes[link.rep_a] || (nodes[link.rep_a] = {name: link.rep_a});
          link.target = nodes[link.rep_b] || (nodes[link.rep_b] = {name: link.rep_b});
      });


      all_links = deepCopyFunction(links);

      var force = d3.forceSimulation()
            .nodes(d3.values(nodes))
            .force("link", d3.forceLink(links).distance(10))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .force("charge", d3.forceManyBody().strength(-100))
            .alphaTarget(1)
            .on("tick", tick);

      // add topic and tweet_count for each node in metadata
      metadata.forEach(function(m) {
      var result1 = data_tp.filter(function(tp) {
        return tp.name === m.tweet_screen_name;
        });
        m.topic = (result1[0] !== undefined) ? result1[0].topic : null;
        m.tp_tweet_count = (result1[0] !== undefined) ? result1[0].tweet_count : null;
      });

      //nodes x y metadata is added only after the var forceSimulation is called above
      for (let key in nodes){
        var result = metadata.filter(function(rep_meta) {
          return key === rep_meta.tweet_screen_name;
        });
        //update nodes with combined info
        nodes[key].gender = (result[0] !== undefined) ? result[0].gender : null;
        nodes[key].party = (result[0] !== undefined) ? result[0].party : null;
        nodes[key].hashtags_count = (result[0] !== undefined) ? result[0].hashtags_count : null;
        nodes[key].mentions_count = (result[0] !== undefined) ? result[0].mentions_count : null;
        nodes[key].retweet_count = (result[0] !== undefined) ? result[0].retweet_count : null;
        nodes[key].total_interaction = (result[0] !== undefined) ? result[0].total_interaction : null;
        nodes[key].topic = (result[0] !== undefined) ? result[0].topic : null;
        nodes[key].tp_tweet_count = (result[0] !== undefined) ? result[0].tp_tweet_count : null;

      }

    //--------------------------- NETWORK GRAPH ------------------------------//
    //---------- add links ----------------//
        var path = svg.append("g")
            .selectAll("path")
            .data(links)
            .enter()
            .append("path")
            .attr("class", function(d) { return "link " + d.type; })
            .style("stroke", "grey")
            ;

        //---------- define nodes ----------------//
        var node = svg.selectAll(".node")
            .data(force.nodes())
            .enter().append("g")
            .attr("class", "node")
            .on("dblclick", releasenode)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
                );


        node.append("text")
            .attr("dx", text_space_scale)
            .attr("dy", ".35em")
            .text(function(d) {
              if (most_influential_congress_handles.includes(d.name)){
                return d.name;
              }
            });

        //---------- add nodes ----------------//
        node.append("circle")
            .attr("r", function(d) {
              d.weight = path.filter(function(l) {
                  return l.source.name == d.name  || l.target.name == d.name
                  }).size();

              weights.push(d.weight); // add weight to the array
              prolific_weights.push(d.total_interaction);
              min_degree = Math.min.apply(Math,prolific_weights);
              max_degree = Math.max.apply(Math,prolific_weights);
              var minRadius = 1;
              return minRadius + (d.total_interaction /node_shrink_scale);
              })
            .style("fill", function (d) {
               color = d3.scaleLinear().domain([min_degree,max_degree]).range(['#f7fbff','#08519c']);
              return color(d.total_interaction); })
            .on("mouseover",function(d){
                    tooltip.show(d);
                })
            .on("mouseout", function(d){
                    tooltip.hide(d);
                })
            ;


        var w = prolific_weights.sort(d3.descending).slice(0,highlight_node_count);

        Object.entries(nodes).forEach(item => {
            curr_weight = item[1].total_interaction;
            if (w.includes(curr_weight)){
              most_influential_congress.push(item);
            }
        })

        most_influential_congress.forEach(function(item){
          most_influential_congress_handles.push(item[0]);
        });

        // compute the source and target nodes for the links
        links.forEach(function(link) {
           for (var i = 0; i < highlight_node_count; i++) {
                if (link.rep_a == most_influential_congress_handles[i] || link.rep_b == most_influential_congress_handles[i]){
                  link.source = nodes[link.rep_a] || (nodes[link.rep_a] = {name: link.rep_a});
                  link.target = nodes[link.rep_b] || (nodes[link.rep_b] = {name: link.rep_b});
                  filtered_links.push(link);
                }
              }
        });
        curr_filtered_links = deepCopyFunction(filtered_links);

        //stops the graph animation and compresses nodes and edges into top left corner of div, removes the div from html
        d3.select("#container").selectAll("*").remove();

        svg = d3.select("#container").append("svg")
          .attr("width", width + margin.left*2 + margin.right*2)
          .attr("height", height )
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top * 2 + ")");

        path = svg.append("g")
            .selectAll("path")
            .data(filtered_links)
            .enter()
            .append("path")
            .attr("class", function(d) { return "link " + d.type; })
            .style("stroke", "grey");

        force = d3.forceSimulation()
            .nodes(d3.values(nodes))
            .force("filtered_links", d3.forceLink(filtered_links).distance(10))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            .force("charge", d3.forceManyBody().strength(-250))
            .alphaTarget(1)
            .on("tick", tick);

        node = svg.selectAll(".node")
            .data(force.nodes())
            .enter().append("g")
            .attr("class", "node")
            .on("dblclick", releasenode)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
                );

        //---------- add nodes ----------------//
        node.append("circle")
            .attr("r", function(d) {
              d.weight = path.filter(function(l) {
                  return l.source.name == d.name  || l.target.name == d.name
                  }).size();

              weights.push(d.weight); // add weight to the array
              prolific_weights.push(d.total_interaction);
              min_degree = Math.min.apply(Math,prolific_weights);
              max_degree = Math.max.apply(Math,prolific_weights);
              var minRadius = 1;
              return minRadius + (d.total_interaction /node_shrink_scale);
              })
            .style("fill", function (d) {
               color = d3.scaleLinear().domain([min_degree,max_degree]).range(['#f7fbff','#08519c']);
              return color(d.total_interaction); })
            .on("mouseover",function(d){
                    tooltip.show(d);
                })
            .on("mouseout", function(d){
                    tooltip.hide(d);
                })
            ;

        node.append("text")
            .attr("dx", text_space_scale)
            .attr("dy", ".35em")
            .text(function(d) {
              if (most_influential_congress_handles.includes(d.name)){
                return d.name;
              }
            });


        all_nodes = deepCopyFunction(nodes);


        //---------- add curvy lines ----------------//
        function tick() {
            path.attr("d", function(d) {
              var dx = d.target.x - d.source.x,
                  dy = d.target.y - d.source.y,
                  dr = Math.sqrt(dx * dx + dy * dy);
              return "M" +
                  d.source.x + "," +
                  d.source.y + "A" +
                  dr + "," + dr + " 0 0,1 " +
                  d.target.x + "," +
                  d.target.y;
            });

            node.attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
        };


        function dragstarted(d) {
            if (!d3.event.active) force.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        };

        function dragged(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
            d.fixed = true;
            d3.select(this).select("circle").style("fill","#dd1c77"); //change circle color

        };

        function dragended(d) {
            if (!d3.event.active) force.alphaTarget(0);
            if (d.fixed == true) {
                d.fx = d.x;
                d.fy = d.y;
            }
            else {
                d.fx = null;
                d.fy = null;
            }
        };

        function releasenode(d) {
          d3.select(this).select("circle")
              .style("fill", function (d) {
              return color(d.total_interaction); })  // return color to original
          d.fx = null;
          d.fy = null;
        };


      svg.append("text")
          .attr("x", width - 100)
          .attr("y", margin.top + 1000)
          .attr("font-size", "12px")
          .attr("font-family", "Helvetica")
          .attr("fill", "#253494")
          .attr("text-anchor", "right")
          .text("Dataliens");
        });

     //TOOD: Legend not showing because it's too far right on the html page for some reasons
    //   var legend = svg.selectAll(".legend")
    //       // .data(d3.scaleLinear().domain())
    //       .data(myColor.domain())
    //       .enter().append("g")
    //       .attr("class", "legend")
    //       .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    //   legend.append("rect")
    //       .attr("x", width - 200)
    //       .attr("width", 18)
    //       .attr("height", 18)
    //       .style("fill", myColor);

    //   legend.append("text")
    //       .attr("x", width - 220)
    //       .attr("y", 9)
    //       .attr("dy", ".35em")
    //       .style("text-anchor", "end")
    //       .text(function(d) { return d; });

    });
});

const deepCopyFunction = (inObject) => {
  let outObject, value, key

  if (typeof inObject !== "object" || inObject === null) {
    return inObject; // Return the value if inObject is not an object
  }
  // Create an array or object to hold the values
  outObject = Array.isArray(inObject) ? [] : {};

  for (key in inObject) {
    value = inObject[key];
    // Recursively (deep) copy for nested objects, including arrays
    outObject[key] = deepCopyFunction(value);
  }
  return outObject;
}

function calculateLinks(nodes, most_influential_congress_handles, selectedGroup, dropdown){
  curr_filtered_links = [];
  if (dropdown == "gender"){
    if (selectedGroup == "All"){
      all_links.forEach(function(link) {
         for (var i = 0; i < highlight_node_count; i++) {
            if (link.rep_a == most_influential_congress_handles[i] || link.rep_b == most_influential_congress_handles[i]){
              //if the party or topic of the node is incorrect, skip that node
              if (curr_party != "All"){
                if(all_nodes[link.rep_a].party != curr_party || all_nodes[link.rep_b].party != curr_party){
                  continue;
                }
              }
              if (curr_topic != "All"){
                if(all_nodes[link.rep_a].topic != curr_topic || all_nodes[link.rep_b].topic != curr_topic){
                  continue;
                }
              }
              link.source = nodes[link.rep_a] || (nodes[link.rep_a] = {name: link.rep_a});
              link.target = nodes[link.rep_b] || (nodes[link.rep_b] = {name: link.rep_b});
              curr_filtered_links.push(link);
            }
          }
      });
    }
    else if (gender_options.includes(selectedGroup)) {
      all_links.forEach(function(link) {
         for (var i = 0; i < highlight_node_count; i++) {
            if (link.rep_a == most_influential_congress_handles[i] || link.rep_b == most_influential_congress_handles[i]){
              if (all_nodes[link.rep_a].gender == selectedGroup && all_nodes[link.rep_b].gender == selectedGroup){
                //if the party or topic of the node is incorrect, skip that node
                if (curr_party != "All"){
                  if(all_nodes[link.rep_a].party != curr_party || all_nodes[link.rep_b].party != curr_party){
                    continue;
                  }
                }
                if (curr_topic != "All"){
                  if(all_nodes[link.rep_a].topic != curr_topic || all_nodes[link.rep_b].topic != curr_topic){
                    continue;
                }
              }
                link.source = nodes[link.rep_a] || (nodes[link.rep_a] = {name: link.rep_a});
                link.target = nodes[link.rep_b] || (nodes[link.rep_b] = {name: link.rep_b});
                curr_filtered_links.push(link);
              }
            }
          }
      });
    }
  }
  else if (dropdown == "party"){
    if (selectedGroup == "All"){
      all_links.forEach(function(link) {
         for (var i = 0; i < highlight_node_count; i++) {
            if (link.rep_a == most_influential_congress_handles[i] || link.rep_b == most_influential_congress_handles[i]){
              //if the gender or topic of the node is incorrect, skip that node
              if (curr_gender != "All"){
                if(all_nodes[link.rep_a].gender != curr_gender || all_nodes[link.rep_b].gender != curr_gender){
                  continue;
                }
              }
              if (curr_topic != "All"){
                if(all_nodes[link.rep_a].topic != curr_topic || all_nodes[link.rep_b].topic != curr_topic){
                  continue;
                }
              }
              link.source = nodes[link.rep_a] || (nodes[link.rep_a] = {name: link.rep_a});
              link.target = nodes[link.rep_b] || (nodes[link.rep_b] = {name: link.rep_b});
              curr_filtered_links.push(link);
            }
          }
      });
    }
    else if (party_options.includes(selectedGroup)){
      all_links.forEach(function(link) {
        for (var i = 0; i < highlight_node_count; i++) {
          if (link.rep_a == most_influential_congress_handles[i] || link.rep_b == most_influential_congress_handles[i]){
            if (all_nodes[link.rep_a].party == selectedGroup && all_nodes[link.rep_b].party == selectedGroup){
              //if the gender or topic of the node is incorrect, skip that node
              if (curr_gender != "All"){
                if(all_nodes[link.rep_a].gender != curr_gender || all_nodes[link.rep_b].gender != curr_gender){
                  continue;
                }
              }
              if (curr_topic != "All"){
                if(all_nodes[link.rep_a].topic != curr_topic || all_nodes[link.rep_b].topic != curr_topic){
                  continue;
                }
              }
              link.source = nodes[link.rep_a] || (nodes[link.rep_a] = {name: link.rep_a});
              link.target = nodes[link.rep_b] || (nodes[link.rep_b] = {name: link.rep_b});
              curr_filtered_links.push(link);
            }
          }
        }
      });
    }
  }
  else if (dropdown == "topic"){
    if (selectedGroup == "All"){
      all_links.forEach(function(link) {
         for (var i = 0; i < highlight_node_count; i++) {
            if (link.rep_a == most_influential_congress_handles[i] || link.rep_b == most_influential_congress_handles[i]){
              //if the gender or party of the node is incorrect, skip that node
              if (curr_gender != "All"){
                if(all_nodes[link.rep_a].gender != curr_gender || all_nodes[link.rep_b].gender != curr_gender){
                  continue;
                }
              }
              if (curr_party != "All"){
                if(all_nodes[link.rep_a].party != curr_party || all_nodes[link.rep_b].party != curr_party){
                  continue;
                }
              }
              link.source = nodes[link.rep_a] || (nodes[link.rep_a] = {name: link.rep_a});
              link.target = nodes[link.rep_b] || (nodes[link.rep_b] = {name: link.rep_b});
              curr_filtered_links.push(link);
            }
          }
      });
    }
    else if (topic_options.includes(selectedGroup)){
      all_links.forEach(function(link) {
        for (var i = 0; i < highlight_node_count; i++) {
          if (link.rep_a == most_influential_congress_handles[i] || link.rep_b == most_influential_congress_handles[i]){
            if (all_nodes[link.rep_a].topic == selectedGroup && all_nodes[link.rep_b].topic== selectedGroup){
              //if the gender or party of the node is incorrect, skip that node
              if (curr_gender != "All"){
                if(all_nodes[link.rep_a].gender != curr_gender || all_nodes[link.rep_b].gender != curr_gender){
                  continue;
                }
              }
              if (curr_party != "All"){
                if(all_nodes[link.rep_a].party != curr_party || all_nodes[link.rep_b].party != curr_party){
                  continue;
                }
              }
              link.source = nodes[link.rep_a] || (nodes[link.rep_a] = {name: link.rep_a});
              link.target = nodes[link.rep_b] || (nodes[link.rep_b] = {name: link.rep_b});
              curr_filtered_links.push(link);
            }
          }
        }
      });
    }
  }
}

// A function that updates the graph
function update(selectedGroup, dropdown) {

  var prolific_weights = [];

  var weights = []; // array to save weights/degrees

  var most_influential_congress = [];

  var most_influential_congress_handles = [];
  // Create new data with the selection
  d3.select("#container").selectAll("*").remove();

  if (dropdown == "gender"){
    if (selectedGroup == "All"){
      if (curr_party == "All" && curr_topic == "All"){
        nodes = deepCopyFunction(all_nodes);
      }
      //recopy the nodes with the correct other params i.e. gender or topic
      else {
        Object.entries(all_nodes).forEach(item => {
          key = item[0];
          master_node = all_nodes[key];
          master_gender = all_nodes[key].gender;
          master_party = all_nodes[key].party;
          master_topic = all_nodes[key].topic;
          //remove node if party or topic does not match selected
          if (master_party != curr_party || master_topic != curr_topic){
            delete nodes[key];
          }
          //add node back in if party or topic matches selected
          if ((master_party == curr_party || curr_party == "All") && !(key in nodes) && (master_topic == curr_topic|| curr_topic=="All")) {
            nodes[key] = master_node;
          }
        })
      }
    }
    else if (gender_options.includes(selectedGroup)) {
      Object.entries(all_nodes).forEach(item => {
        key = item[0];
        master_node = all_nodes[key];
        master_gender = all_nodes[key].gender;
        master_party = all_nodes[key].party;
        master_topic = all_nodes[key].topic;
        party_mismatch = false;
        topic_mismatch = false;
        //check for all because all includes all parties
        if (curr_party != "All" && master_party != curr_party){
          party_mismatch = true;
        }
        if (curr_topic != "All" && master_topic != curr_topic){
          topic_mismatch = true;
        }
        //remove node if gender does not match selected
        if (master_gender != selectedGroup || party_mismatch == true || topic_mismatch == true ){
          delete nodes[key];
        }
        //add node back in if gender matches selected
        if (master_gender == selectedGroup && !party_mismatch && !(key in nodes) && !topic_mismatch) {
          nodes[key] = master_node;
        }
      })
    }
  }else if (dropdown == "party"){
    if (selectedGroup == "All"){
      if (curr_gender == "All" && curr_topic == "All"){
        nodes = deepCopyFunction(all_nodes);
      }
      //recopy the nodes with the correct other params i.e. gender or topic
      else {
        Object.entries(all_nodes).forEach(item => {
          key = item[0];
          master_node = all_nodes[key];
          master_gender = all_nodes[key].gender;
          master_party = all_nodes[key].party;
          master_topic = all_nodes[key].topic;
          //remove node if gender does not match selected
          if (master_gender != curr_gender || master_topic != curr_topic){
            delete nodes[key];
          }
          //add node back in if gender matches selected
          if ((master_gender == curr_gender || curr_gender == "All") && !(key in nodes) && (master_topic == curr_topic|| curr_topic=="All")){
            nodes[key] = master_node;
          }
        })
      }
    }
    else if (party_options.includes(selectedGroup)){
      //console.log("party changed to " + String(selectedGroup));
      Object.entries(all_nodes).forEach(item => {
        key = item[0];
        master_node = all_nodes[key];
        master_gender = all_nodes[key].gender;
        master_party = all_nodes[key].party;
        master_topic = all_nodes[key].topic;
        gender_mismatch = false;
        topic_mismatch = false;
        //check for all because all includes all parties
        if (curr_gender != "All" && master_gender != curr_gender){
          gender_mismatch = true;
        }
        if (curr_topic != "All" && master_topic != curr_topic){
          topic_mismatch = true;
        }

        //remove node if gender does not match selected
        if (master_party != selectedGroup || master_gender != curr_gender || topic_mismatch == true){
          delete nodes[key];
        }
        //add node back in if party matches selected
        if (master_party == selectedGroup && !gender_mismatch  && !(key in nodes) && !topic_mismatch) {
          nodes[key] = master_node;
        }
      })
    }
  }else if (dropdown == "topic"){
    if (selectedGroup == "All"){
      if (curr_gender == "All" && curr_party == "All"){
        nodes = deepCopyFunction(all_nodes);
      }
      //recopy the nodes with the correct other params i.e. gender or topic
      else {
        Object.entries(all_nodes).forEach(item => {
          key = item[0];
          master_node = all_nodes[key];
          master_gender = all_nodes[key].gender;
          master_party = all_nodes[key].party;
          master_topic = all_nodes[key].topic;
          //remove node if gender does not match selected
          if (master_gender != curr_gender || master_party != curr_party){
            delete nodes[key];
          }
          //add node back in if gender matches selected
          if ((master_gender == curr_gender || curr_gender == "All") && !(key in nodes) && (master_party == curr_party || curr_party == "All") ){
            nodes[key] = master_node;
          }
        })
      }
    }
    else if (topic_options.includes(selectedGroup)){
      Object.entries(all_nodes).forEach(item => {
        key = item[0];
        master_node = all_nodes[key];
        master_gender = all_nodes[key].gender;
        master_party = all_nodes[key].party;
        master_topic = all_nodes[key].topic;
        gender_mismatch = false;
        party_mismatch = false;
        //check for all because all includes all parties
        if (curr_gender != "All" && master_gender != curr_gender){
          gender_mismatch = true;
        }
        if (curr_party != "All" && master_party != curr_party){
          party_mismatch = true;
        }
        //remove node if gender does not match selected
        if (master_topic != selectedGroup || master_gender != curr_gender || party_mismatch == true){
          delete nodes[key];
        }
        //add node back in if party matches selected
        if (master_topic == selectedGroup && !gender_mismatch  && !(key in nodes) && !party_mismatch)
        {
          nodes[key] = master_node;
        }
      })
    }
  }


  force = d3.forceSimulation()
      .nodes(d3.values(nodes))
      .force("link", d3.forceLink(curr_filtered_links).distance(10))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY())
      .force("charge", d3.forceManyBody().strength(-250))
      .alphaTarget(1)
      .on("tick", tick);

  var path = svg.append("g")
      .selectAll("path")
      .data(all_links)
      .enter()
      .append("path")
      .attr("class", function(d) { return "link " + d.type; })
      .style("stroke", "grey")
      ;

  //---------- define nodes ----------------//
  var node = svg.selectAll(".node")
      .data(force.nodes())
      .enter().append("g")
      .attr("class", "node")
      .on("dblclick", releasenode)
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
          );


  node.append("text")
      .attr("dx", text_space_scale)
      .attr("dy", ".35em")
      .text(function(d) {
        if (most_influential_congress_handles.includes(d.name)){
          return d.name;
        }
      });


  //---------- add nodes ----------------//
  node.append("circle")
      .attr("r", function(d) {
        d.weight = path.filter(function(l) {
            return l.source.name == d.name  || l.target.name == d.name
            }).size();

        weights.push(d.weight); // add weight to the array
        prolific_weights.push(d.total_interaction);
        min_degree = Math.min.apply(Math,prolific_weights);
        max_degree = Math.max.apply(Math,prolific_weights);
        var minRadius = 1;
        return minRadius + (d.total_interaction /node_shrink_scale);
        })
      .style("fill", function (d) {
         color = d3.scaleLinear().domain([min_degree,max_degree]).range(['#f7fbff','#08519c']);
        return color(d.total_interaction); })
      .on("mouseover",function(d){
          tooltip.show(d);
         })
      .on("mouseout", function(d){
         tooltip.hide(d);
         })
      ;

  var w = prolific_weights.sort(d3.descending).slice(0,highlight_node_count);

  Object.entries(nodes).forEach(item => {
      curr_weight = item[1].total_interaction;
      if (w.includes(curr_weight)){
        most_influential_congress.push(item);
      }
  })


  var i = 0;
  most_influential_congress.forEach(function(item){
    if (i < highlight_node_count){
      most_influential_congress_handles.push(item[0]);
    }
    i = i + 1;
  });

  calculateLinks(nodes, most_influential_congress_handles, selectedGroup, dropdown);


  svg = d3.select("#container").append("svg")
      .attr("width", width + margin.left*2 + margin.right*2)
      .attr("height", height )
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top * 2 + ")");

  path = svg.append("g")
      .selectAll("path")
      .data(curr_filtered_links)
      .enter()
      .append("path")
      .attr("class", function(d) { return "link " + d.type; })
      .style("stroke", "grey");

  force = d3.forceSimulation()
      .nodes(d3.values(nodes))
      .force("link", d3.forceLink(curr_filtered_links).distance(10))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY())
      .force("charge", d3.forceManyBody().strength(-250))
      .alphaTarget(1)
      .on("tick", tick);

  node = svg.selectAll(".node")
      .data(force.nodes())
      .enter().append("g")
      .attr("class", "node")
      .on("dblclick", releasenode)
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
          );

  node.append("text")
      .attr("dx", text_space_scale)
      .attr("dy", ".35em")
      .text(function(d) {
        if (most_influential_congress_handles.includes(d.name)){
          return d.name;
        }
      });

  //---------- add nodes ----------------//
  node.append("circle")
      .attr("r", function(d) {
        d.weight = path.filter(function(l) {
            return l.source.name == d.name  || l.target.name == d.name
            }).size();

        weights.push(d.weight); // add weight to the array
        prolific_weights.push(d.total_interaction);
        min_degree = Math.min.apply(Math,prolific_weights);
        max_degree = Math.max.apply(Math,prolific_weights);
        var minRadius = 1;
        return minRadius + (d.total_interaction /node_shrink_scale);
        })
      .style("fill", function (d) {
         color = d3.scaleLinear().domain([min_degree,max_degree]).range(['#f7fbff','#08519c']);
        return color(d.total_interaction); })
      .on("mouseover",function(d){
         tooltip.show(d);
         })
      .on("mouseout", function(d){
         tooltip.hide(d);
         })
         ;

  //---------- add curvy lines ----------------//
  function tick() {
      path.attr("d", function(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
        return "M" +
            d.source.x + "," +
            d.source.y + "A" +
            dr + "," + dr + " 0 0,1 " +
            d.target.x + "," +
            d.target.y;
      });

      node.attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
      });
  };

  function dragstarted(d) {
      if (!d3.event.active) force.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
  };

  function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
      d.fixed = true;
      d3.select(this).select("circle").style("fill","#dd1c77"); //change circle color

  };

  function dragended(d) {
      if (!d3.event.active) force.alphaTarget(0);
      if (d.fixed == true) {
          d.fx = d.x;
          d.fy = d.y;
      }
      else {
          d.fx = null;
          d.fy = null;
      }
  };

  function releasenode(d) {
    d3.select(this).select("circle")
        .style("fill", function (d) {
        return color(d.total_interaction); })// return color to original
    d.fx = null;
    d.fy = null;
  };

  svg.append("text")
          .attr("x", width - 100)
          .attr("y", margin.top + 1000)
          .attr("font-size", "12px")
          .attr("font-family", "Helvetica")
          .attr("fill", "#253494")
          .attr("text-anchor", "right")
          .text("Dataliens");


}

d3.select('#gender').on("change", function () {
  // recover the option that has been chorep
  var selectedOption = d3.select(this).property("value");
  curr_gender = selectedOption;
  // run the updateChart function with this selected option
  update(selectedOption, "gender");
});


d3.select('#party').on("change", function () {
    // recover the option that has been chorep
  var selectedOption = d3.select(this).property("value");
  curr_party = selectedOption;
  // run the updateChart function with this selected option
  update(selectedOption, "party");
});


d3.select('#topic').on("change", function () {
    // recover the option that has been chorep
  var selectedOption = d3.select(this).property("value");
  curr_topic = selectedOption;
  // run the updateChart function with this selected option
  update(selectedOption, "topic");
});

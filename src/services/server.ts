import express from 'express'
import open from 'open'

import * as svgs from './svgs'

export async function startServer (resources: Array<{ id: number, path: string, content: string }>) {
  const app = express()
  app.get('/', (_req, res, _next) => {
    res.contentType('text/html')
    res.send(indexHtml({ count: resources.length }))
  })
  app.get('/search', (req, res, _next) => {
    const query = req.query['q']
    if (query && typeof query === 'string' && query.length > 0) {
      const lowercase = query.toLowerCase()
      return res.json(resources.filter(resource => resource.path.toLowerCase().includes(lowercase) || resource.content.toLowerCase().includes(lowercase)))
    }
    return res.status(400).send('400 - Bad Request')
  })
  app.get('/img/logo', (_req, res, _next) => {
    res.contentType('image/svg+xml')
    res.send(svgs.CloudfsLogoSvg())
  })
  app.get('/icons/:type', (req, res, _next) => {
    const type = req.params.type
    if (type === 'alarms') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonCloudWatchAlarm48LightSvg())
    }
    if (type === 'apis') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonAPIGateway48Svg())
    }
    if (type === 'buckets') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonSimpleStorageServiceS3Standard48LightSvg())
    }
    if (type === 'canaries') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonCloudWatchSynthetics48LightSvg())
    }
    if (type === 'certificates') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAWSCertificateManager48Svg())
    }
    if (type === 'distributions') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonCloudFront48Svg())
    }
    if (type === 'domains') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonRoute53HostedZone48LightSvg())
    }
    if (type === 'functions') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAWSLambdaLambdaFunction48LightSvg())
    }
    if (type === 'instances') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAmazonEC2Instance48LightSvg())
    }
    if (type === 'parameters') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAWSSystemsManagerParameterStore48LightSvg())
    }
    if (type === 'queues') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonSimpleQueueService48Svg())
    }
    if (type === 'regions') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResDisk48LightSvg())
    }
    if (type === 'stacks') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ResAWSCloudFormationStack48LightSvg())
    }
    if (type === 'tables') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonDynamoDB48Svg())
    }
    if (type === 'topics') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonSimpleNotificationService48Svg())
    }
    if (type === 'vpcs') {
      res.contentType('image/svg+xml')
      return res.send(svgs.ArchAmazonVirtualPrivateCloud48Svg())
    }
    return res.status(404).send('404 - Not Found')
  })
  const port = 3000
  const url = `http://localhost:${port}/`
  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`Server listening on ${url} ...`)
      resolve()
    })
  })
  await open(url)
}

export function indexHtml (params: { count: number }) {
  return '' +
`
<html>
<head>
  <title>cfs | browse</title>
</head>
<body>

<!-- CSS: Reset -->
<style>
html {
  box-sizing: border-box;
  font-size: 16px;
}

*, *:before, *:after {
  box-sizing: inherit;
}

body, h1, h2, h3, h4, h5, h6, p, ol, ul {
  margin: 0;
  padding: 0;
  font-weight: normal;
}

ol, ul {
  list-style: none;
}

img {
  max-width: 100%;
  height: auto;
}
</style>

<!-- CSS: Main CSS -->
<style>
@import url("https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700");
body {
  font-family: "Open Sans", sans-serif;
  background: #EEEEEE;
}

.container {
  margin: 0 auto;
  margin-top: 50px;
  width: 980px;
}

header {
  display: flex;
  align-items: center;
  font-size: 1em;
  font-weight: 600;
  color: #bdbdbd;
  padding: 20px;
  box-sizing: border-box;
  -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
  text-align: center;
}
header .column {
  width: 725px;
  text-align: left;
}
header .search-subtitle {
  font-weight: 400;
  margin-top: 5px;
  text-align: right;
}

ul.items li.item {
  display: flex;
  align-items: center;
  margin: 20px 0;
  padding: 20px;
  background: #fff;
  border-radius: 5px;
  box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.1);
}
ul.items li.item .result {
  display: flex;
  align-items: center;
}
ul.items li.item .result .icon {
  width: 50px;
  border-radius: 5px;
}
ul.items li.item .result .name {
  margin-left: 20px;
  border-radius: 15px;
}

code {
  padding: 10px;
  display: block;
  background: rgb(247, 246, 243);
  width: 100%;
  font-size: 15px;
  line-height: 1.55;
  border-radius: 12px;
  overflow-x: scroll;
}
</style>

<!-- CSS: Search Bar -->
<style>
.search-container {
  width: 490px;
  display: block;
}

input#search {
  margin: 0 auto;
  width: 100%;
  height: 45px;
  padding: 0 20px;
  font-size: 1rem;
  border: 1px solid #D0CFCE;
  outline: none;
}
input#search:focus {
  border: 1px solid #008ABF;
  transition: 0.35s ease;
  color: #008ABF;
}
input#search:focus::-webkit-input-placeholder {
  transition: opacity 0.45s ease;
  opacity: 0;
}
input#search:focus::-moz-placeholder {
  transition: opacity 0.45s ease;
  opacity: 0;
}
input#search:focus:-ms-placeholder {
  transition: opacity 0.45s ease;
  opacity: 0;
}
</style>

<!-- CSS: JSON Syntax Highlighting -->
<style>
  pre { padding: 5px; margin: 5px; }
  .json .string { color: green; }
  .json .number { color: darkorange; }
  .json .boolean { color: blue; }
  .json .null { color: gray; }
  .json .key { color: #9575cd; }
</style>

<!-- HTML: Main HTML -->
<section class="container">
    <header>
        <div class="column">
      <img src="/img/logo" alt="cloudfs - An easy way to discover and manage your cloud like a local filesystem." width="350px">
      <div class="search-container">
        <input id="search" type="text" placeholder="Just start typing to search" autocomplete="off" autofocus />
        <div class="search-subtitle">
          <small id="count">${params.count} ${params.count === 1 ? 'resource' : 'resources'} discovered</small>
        </div>
      </div>
        </div>
    </header>
    <ul id="results" class="items"></ul>
</section>

<!-- Script: Result Item Template -->
<script type="text/javascript">
  function createResultHtml (params) {
    return \`
      <li class="item">
        <div class="result">
          <img class="icon" src="/icons/\${params.path.split('/')[1]}" alt="Amazon Virtual Private Cloud (VPC)">
          <div class="name">\${params.path}</div>
        </div>
      </li>
    \`
  }
</script>

<!-- Script: Debounce Function -->
<script type="text/javascript">
  function debounce (func, timeout) {
    var timer = undefined;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        func.apply(this, args);
      }, timeout);
    }
  }
</script>

<!-- Script: JSON Syntax Highlighting -->
<script type="text/javascript">
  function createHighlightedJsonElement (jsonString) {
    var escaped = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var highlighted = escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      var cls = 'number';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
      } else if (/null/.test(match)) {
        cls = 'null';
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
    var code = document.createElement('code');
    code.innerHTML = highlighted;
    var pre = document.createElement('pre');
    pre.appendChild(code);
    pre.className = 'json'
    return pre;
  }
</script>

<!-- Script: Main Script -->
<script type="text/javascript">
  var count = document.getElementById("count");
  var results = document.getElementById("results");
  var originalCount = count.innerHTML;
  var lastValue = '';
  function isSameRequest (value) { return lastValue === value; };
  function search (value) {
    if (isSameRequest(value)) return;
    lastValue = value;
    results.innerHTML = "";
    if (value === "") {
      count.innerHTML = originalCount;
      return;
    };
    var params = new URLSearchParams();
    params.append("q", value);
    fetch("/search?" + params.toString()).then(response => response.json()).then(resources => {
      if (!isSameRequest(value)) return;
      count.innerHTML = \`\${resources.length} \${resources.length === 1 ? 'resource' : 'resources'} discovered\`;
      resources.forEach(resource => {
        if (!isSameRequest(value)) return;
        const result = document.createElement("div");
        result.innerHTML = createResultHtml(resource);
        results.appendChild(result);
        results.appendChild(createHighlightedJsonElement(resource.content));
      });
    });
  };
  var input = document.getElementById("search");
  if (window.location.hash) {
    input.value = decodeURIComponent(window.location.hash.substring(1));
    search(input.value);
  }
  input.onkeyup = debounce(function (event) {
    search(event.target.value);
    history.replaceState(null, null, "#" + encodeURIComponent(event.target.value));
  }, 200)
</script>

</body>
</html>
`
}

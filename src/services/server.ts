import express from 'express'
import open from 'open'

export async function startServer (resources: Array<{ id: number, path: string, content: string }>) {
  const app = express()
  app.get('/', (_req, res, _next) => {
    res.contentType('text/html')
    res.send(`
      <style>
        body {
          margin: 0;
          padding: 0;
        }
        #search {
          padding: 10px;
          width: 50%;
        }
        #results {
          padding: 20px;
        }
        code {
          display: block;
          background: rgb(247, 246, 243);
          width: 100%;
          font-size: 15px;
          line-height: 1.55;
          border-radius: 12px;
          overflow-x: scroll;
        }
      </style>
      <input id="search" />
      <div id="results"></div>
      <script type="text/javascript">
        var input = document.getElementById("search");
        var lastValue = undefined;
        input.onkeyup = function (event) {
          var value = event.target.value;
          if (value === lastValue) return;
          lastValue = value;
          document.getElementById("results").innerHTML = "";
          var params = new URLSearchParams();
          params.append("q", lastValue);
          fetch("/search?" + params.toString()).then(response => response.json()).then(resources => {
            if (input.value !== value) return;
            resources.forEach(resource => {
              if (input.value !== value) return;
              const path = document.createElement("p");
              path.textContent = resource.path;
              const content = document.createElement("pre");
              const contentCode = document.createElement("code");
              contentCode.textContent = resource.content;
              content.appendChild(contentCode);
              const result = document.createElement("div");
              result.id = "resource-" + resource.id;
              result.className = "result";
              result.appendChild(path);
              result.appendChild(content);
              document.getElementById("results").appendChild(result);
            });
          });
        };
      </script>
    `)
  })
  app.get('/search', (req, res, _next) => {
    if (!req.query['q']) res.status(400).send('400 - Bad Request')
    const query = req.query['q']
    if (query && typeof query === 'string') {
      res.json(resources.filter(resource => resource.path.includes(query) || resource.content.includes(query)))
    } else {
      res.status(400).send('400 - Bad Request')
    }
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

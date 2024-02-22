// Import required modules
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const port = 3000;
const scriptURL =
  "https://tstdrv1278203.restlets.api.netsuite.com/app/site/hosting/restlet.nl";
const scriptID = "2520";
const config = {
  headers: {
    Authorization:
      "Bearer eyJraWQiOiJjLlRTVERSVjEyNzgyMDMuMjAyNC0wMS0xMF8wMC0xMS0zNSIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIzOzQ4MjMiLCJhdWQiOlsiNDg4MUI5NTgtMzdCOC00MzUzLThBQTctQkNGODRBNTM3QkM5O1RTVERSVjEyNzgyMDMiLCIyMWExNTk5ZjZmMDUxOWQ1MGZhYmI4M2Q0YmY4MzMyMzIwZDI4MzRmZjkzMDIxYTU1NjBiYTUzNzk2MTdkNGMwIl0sInNjb3BlIjpbInJlc3RsZXRzIl0sImlzcyI6Imh0dHBzOi8vc3lzdGVtLm5ldHN1aXRlLmNvbSIsIm9pdCI6MTcwODI0NzkwNiwiZXhwIjoxNzA4NTI2MjE1LCJpYXQiOjE3MDg1MjI2MTUsImp0aSI6IlRTVERSVjEyNzgyMDMuYS1hLmYzNDQ1MWMzLTk0MTQtNDE1Zi1iYjIyLTVkM2Y1ZjA5YmZkMF8xNzA4MjQ3OTA2OTc4LjE3MDg1MjI2MTU0MzMifQ.PcMyzQyVYP3zMsd-qMCnPq6JYXd96KkYHemSJkVY-EoRazWoscSpVn2hV-wKyldGud2YjaNIR3ZH82_A1b6P613ZKI0UCds1xr1m1oBNdYipPKPYHOobyoCuDRHAFQpcrQThn5Ck0RaWpF8iLYLF0-ZConuiKus7rjLVB30oftZQkhUXsZ9wYii6Em4JlHycc797kEZ9r4dhAteK4xbJ46Cnc_ICX_4Qb6X52NQgyC3o9ezbyWuucmq7pmcAolrwpozuR8JDJOI44qw7Wi3VWlKqB5U8AgbAWRQk59GlyYE8lr78fofycc45MfgXi4vMe4U85DgXvj9W7nznyjQ4KLw_gaKsxiGwAqjRFDiPdWLHDTdwpgZ0K0g6ORDbN0mS_t9mMlvgImHdSKULx0BrGpj8x80RYmAS-Uw-GBQDtc-8jYmHPanv28lTN4kNdXdPnZPEUE6MBEH3PE1X261WHT_j5ud3Fv4ppSVmCbUdvZ7vIiwfU1RjbyUhQS0ePyDa8iQG2k01wM936IkI6c6SD9Os1qL3xrNOjF9aDVDdQYe9VsWa7XTBob-iGK533C-ugRDA1tbW9iZizBqweHwr7gIghJ_zOqixiY9nhJ94bwX-k9mZ746_jenyR6ChqcTW2-45nQHCUenTOls99-Lxaapt4SJTFBNrOh8kIMp17h4",
  },
  "Content-Type": "application/x-www-form-urlencoded",
};
const params = new URLSearchParams({
  script: "2520",
  deploy: "1",
  message: "from axios",
});

// Create an Express application
const app = express();

// Use bodyParser middleware to parse JSON and URL-encoded request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  try {
    res.send("Hello, this is a GET request!");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// Define a route for handling GET requests
app.get("/get", (req, res) => {
  try {
    var response = SENDGET(scriptURL, params, config);
    console.log(response.data);
    res.send(response);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/post", (req, res) => {
  let data = JSON.stringify({
    "greeting": "how can I help you?"
  });
  let postconfig = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://tstdrv1278203.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=2520&deploy=1',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer eyJraWQiOiJjLlRTVERSVjEyNzgyMDMuMjAyNC0wMS0xMF8wMC0xMS0zNSIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIzOzQ4MjMiLCJhdWQiOlsiNDg4MUI5NTgtMzdCOC00MzUzLThBQTctQkNGODRBNTM3QkM5O1RTVERSVjEyNzgyMDMiLCIyMWExNTk5ZjZmMDUxOWQ1MGZhYmI4M2Q0YmY4MzMyMzIwZDI4MzRmZjkzMDIxYTU1NjBiYTUzNzk2MTdkNGMwIl0sInNjb3BlIjpbInJlc3RsZXRzIl0sImlzcyI6Imh0dHBzOi8vc3lzdGVtLm5ldHN1aXRlLmNvbSIsIm9pdCI6MTcwODI0NzkwNiwiZXhwIjoxNzA4NTI2MjE1LCJpYXQiOjE3MDg1MjI2MTUsImp0aSI6IlRTVERSVjEyNzgyMDMuYS1hLmYzNDQ1MWMzLTk0MTQtNDE1Zi1iYjIyLTVkM2Y1ZjA5YmZkMF8xNzA4MjQ3OTA2OTc4LjE3MDg1MjI2MTU0MzMifQ.PcMyzQyVYP3zMsd-qMCnPq6JYXd96KkYHemSJkVY-EoRazWoscSpVn2hV-wKyldGud2YjaNIR3ZH82_A1b6P613ZKI0UCds1xr1m1oBNdYipPKPYHOobyoCuDRHAFQpcrQThn5Ck0RaWpF8iLYLF0-ZConuiKus7rjLVB30oftZQkhUXsZ9wYii6Em4JlHycc797kEZ9r4dhAteK4xbJ46Cnc_ICX_4Qb6X52NQgyC3o9ezbyWuucmq7pmcAolrwpozuR8JDJOI44qw7Wi3VWlKqB5U8AgbAWRQk59GlyYE8lr78fofycc45MfgXi4vMe4U85DgXvj9W7nznyjQ4KLw_gaKsxiGwAqjRFDiPdWLHDTdwpgZ0K0g6ORDbN0mS_t9mMlvgImHdSKULx0BrGpj8x80RYmAS-Uw-GBQDtc-8jYmHPanv28lTN4kNdXdPnZPEUE6MBEH3PE1X261WHT_j5ud3Fv4ppSVmCbUdvZ7vIiwfU1RjbyUhQS0ePyDa8iQG2k01wM936IkI6c6SD9Os1qL3xrNOjF9aDVDdQYe9VsWa7XTBob-iGK533C-ugRDA1tbW9iZizBqweHwr7gIghJ_zOqixiY9nhJ94bwX-k9mZ746_jenyR6ChqcTW2-45nQHCUenTOls99-Lxaapt4SJTFBNrOh8kIMp17h4'
    },
    data : data
  };
  axios.request(postconfig)
  .then((response) => {
    console.log(JSON.stringify(response.data));
    res.send(response.data)
  })
  .catch((error) => {
    console.log(error);
  });
});

const SENDGET = async (scriptURL, params, config) => {
  console.log(scriptURL + params + config);
  try {
    const response = await axios.get(
      scriptURL + "?script=2520&deploy=1",
      config
    );
    return response;
  } catch (error) {
    console.error(error.message);
  }
};

// Set up the server to listen on port 3000
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

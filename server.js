const express = require('express');
const path = require('path');
const cassandra = require('cassandra-driver');
const axios = require('axios');
const app = express();

// Configuration for the Cassandra client to connect to Astra DB
const client = new cassandra.Client({
    cloud: {
        secureConnectBundle: 'C:/Users/eberf/Downloads/CSSP_Niagara/config/secure-connect-csspg4.zip'
    },
    credentials: {
        username: 'xNLKqkffJYlSTENgyyJcRRus',
        password: 'rdG,2grZAPMhJCG7,8F-pCRpdTggr4Q5xLkZmwtZ5kOwTrDpCDzghjz5kPddIv5C_jDOdrfU4.gG-QRI33O4oEoWY7RdnkZNM2MAom6NLZOF1oTK0WCvZIEmdXrUAO.r'
    }
});

client.connect()
    .then(() => console.log('Successfully connected to Astra DB!'))
    .catch(e => console.error('Error connecting to Astra DB:', e));

// Sets the directory containing static files
app.use(express.static(path.join('C:/Users/eberf/Downloads/CSSP_Niagara')));

app.use(express.json()); // To parse JSON in the request body

// Route to handle form submission
app.post('/submit-form', async (req, res) => {
    const formData = {
        name: req.body.name,
        phone: req.body.phone,
        age: req.body.age,
        weight: req.body.weight,
    };

    try {
        const response = await axios.post('https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/rest/v2/namespaces/document/collections/client', formData, {
            headers: {
                'X-Cassandra-Token': 'AstraCS:xNLKqkffJYlSTENgyyJcRRus:e208724958bb65b2eee41944be8d3e214238ac114e5ea83191ddeb3987d99520',
                'Content-Type': 'application/json'
            }
        });

        console.log('Data inserted into Astra DB:', response.data);
        res.send('Form received and data inserted!');
    } catch (error) {
        console.error('Error inserting data into Astra DB:', error);
        res.status(500).send('Error processing the form');
    }
});

app.get('/track-request', async (req, res) => {
    console.log('Track Request Received:', req.query.phone);
    const phone = req.query.phone; // Get the phone number from the query string

    // Check if a phone number was provided
    if (!phone) {
        // If no phone number is provided, return a 400 Bad Request response
        return res.status(400).send('No phone number provided.');
    }

    try {
        // Attempt to fetch the record from Astra DB using the provided phone number
        const response = await axios.get(`https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/rest/v2/namespaces/document/collections/client?where=%7B%22phone%22%3A%20%7B%22%24eq%22%3A%20%22${phone}%22%7D%7D`,
            {
                headers: {
                    'X-Cassandra-Token': 'AstraCS:xNLKqkffJYlSTENgyyJcRRus:e208724958bb65b2eee41944be8d3e214238ac114e5ea83191ddeb3987d99520',
                    'Content-Type': 'application/json'
                }
            });

        // Check if the returned data contains valid information
        if (response.data && response.data.data && Object.keys(response.data.data).length > 0) {
            // If data is found, send a confirmation message
            res.send('We found your record. Please wait for our return soon.');
        } else {
            // If no data is found, inform the user that there is no record
            res.send('There is no record for this phone number.');
        }
    } catch (error) {
        // Handle errors that occur during the fetch process
        if (error.response && error.response.status === 404) {
            // If a 404 error is returned, inform the user that there is no record
            res.send('There is no record for this phone number.');
        } else {
            // For other errors, log the error and send a 500 Internal Server Error response
            console.error('Error searching data:', error);
            res.status(500).send('Error processing the request');
        }
    }
});

app.put('/update-request', async (req, res) => {
    const { name, phone, age, weight } = req.body;

    if (!name || !phone || !age || !weight) {
        return res.status(400).send('All fields are required.');
    }

    try {
        // Primeiro, encontre o Document ID com base no número de telefone
        const searchResponse = await axios.get(`https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/rest/v2/namespaces/document/collections/client?where=%7B%22phone%22%3A%20%7B%22%24eq%22%3A%20%22${phone}%22%7D%7D`, {
            headers: {
                'X-Cassandra-Token': 'AstraCS:xNLKqkffJYlSTENgyyJcRRus:e208724958bb65b2eee41944be8d3e214238ac114e5ea83191ddeb3987d99520',
                'Content-Type': 'application/json'
            }
        });

        console.log('Search response:', searchResponse.data);

        // Tente extrair o documentId de outra maneira
        let documentId;
        for (let key in searchResponse.data.data) {
            if (searchResponse.data.data.hasOwnProperty(key) && key !== 'undefined') {
                documentId = key;
                break;
            }
        }

        console.log('Found Document ID:', documentId);

        // Verifique se a resposta contém documentos
        if (searchResponse.data.data && Object.keys(searchResponse.data.data).length > 0) {
            // Extrair o Document ID da resposta
            const documentId = Object.keys(searchResponse.data.data)[0];
            console.log('Found Document ID:', documentId);

            // Agora, atualize o registro com o Document ID encontrado
            await axios.put(`https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/rest/v2/namespaces/document/collections/client/${documentId}`, { name, phone, age, weight }, {
                headers: {
                    'X-Cassandra-Token': 'AstraCS:xNLKqkffJYlSTENgyyJcRRus:e208724958bb65b2eee41944be8d3e214238ac114e5ea83191ddeb3987d99520',
                    'Content-Type': 'application/json'
                }
            });

            res.send('Record updated successfully.');
        } else {
            res.status(404).send('Document ID not found.');
        }
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).send('Error updating the record.');
    }
});

app.delete('/delete-request', async (req, res) => {
    const phone = req.query.phone;

    if (!phone) {
        return res.status(400).send('Phone number is required.');
    }

    try {
        // Primeiro, encontre o Document ID com base no número de telefone
        const searchResponse = await axios.get(`https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/rest/v2/namespaces/document/collections/client?where=%7B%22phone%22%3A%20%7B%22%24eq%22%3A%20%22${phone}%22%7D%7D`, {
            headers: {
                'X-Cassandra-Token': 'AstraCS:xNLKqkffJYlSTENgyyJcRRus:e208724958bb65b2eee41944be8d3e214238ac114e5ea83191ddeb3987d99520',
                'Content-Type': 'application/json'
            }
        });

        const documents = searchResponse.data.data;
        const documentId = Object.keys(documents)[0];

        if (documentId) {
            // Agora, delete o registro com o Document ID encontrado
            await axios.delete(`https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/rest/v2/namespaces/document/collections/client/${documentId}`, {
                headers: {
                    'X-Cassandra-Token': 'AstraCS:xNLKqkffJYlSTENgyyJcRRus:e208724958bb65b2eee41944be8d3e214238ac114e5ea83191ddeb3987d99520'
                }
            });

            console.log('Found Document ID:', documentId);

            res.send('Record deleted successfully.');
        } else {
            res.status(404).send('Document ID not found.');
        }

    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).send('Error deleting the record.');
    }
});

app.post('/subscribe', async (req, res) => {
    const { name, email } = req.body;

    const query = `
        mutation {
            insertemail(value: { email: "${email}", name: "${name}" }) {
                value {
                    email
                    name
                }
            }
        }
    `;

    try {
        const response = await axios.post('https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/graphql/keyvalue', { query }, {
            headers: {
                'x-cassandra-token': 'AstraCS:PeDQldrKwITMUelRaCvxobhs:597a9256f3ec4834b171fd0790006a2fdc838216378462d97cbb576a7030d156'
            }
        });

        res.send('Subscription successful.');
    } catch (error) {
        console.error('Error subscribing:', error);
        res.status(500).send('Error processing subscription.');
    }
});

app.get('/confirm-subscription', async (req, res) => {
    const { email } = req.query;

    const query = `
        query {
            email(value: { email: "${email}" }) {
                values {
                    email
                    name
                }
            }
        }
    `;

    try {
        const response = await axios.post('https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/graphql/keyvalue', { query }, {
            headers: {
                'x-cassandra-token': 'AstraCS:PeDQldrKwITMUelRaCvxobhs:597a9256f3ec4834b171fd0790006a2fdc838216378462d97cbb576a7030d156'
            }
        });

        // Adicione um console.log para inspecionar a resposta completa
        console.log('GraphQL response:', response.data);

        // Verifique se há dados na resposta
        const subscriptionData = response.data.data.email;
        if (subscriptionData && subscriptionData.values.length > 0) {
            res.send('Subscription confirmed.');
        } else {
            res.send('No subscription found.');
        }
    } catch (error) {
        console.error('Error confirming subscription:', error);
        res.status(500).send('Error processing confirmation.');
    }
});

app.delete('/cancel-subscription', async (req, res) => {
    const { email } = req.query;

    const query = `
        mutation {
            deleteemail(value: { email: "${email}" }) {
                value {
                    email
                }
            }
        }
    `;

    try {
        const response = await axios.post('https://01ebdc42-d443-452c-bc7d-7d3e6cb703df-us-east1.apps.astra.datastax.com/api/graphql/keyvalue', { query }, {
            headers: {
                'x-cassandra-token': 'AstraCS:PeDQldrKwITMUelRaCvxobhs:597a9256f3ec4834b171fd0790006a2fdc838216378462d97cbb576a7030d156'
            }
        });

        res.send('Subscription cancelled.');
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).send('Error processing cancellation.');
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join('C:/Users/eberf/Downloads/CSSP_Niagara', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

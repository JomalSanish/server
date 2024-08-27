const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Updated MongoDB connection URI
const uri = 'mongodb+srv://whereismybusapp:whereismybus123@whereismybus.xo0bi.mongodb.net/WhereIsMyBus?retryWrites=true&w=majority&appName=WhereIsMyBus';

mongoose.connect(uri)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Define schemas
const stopSchema = new mongoose.Schema({
  name: String,
  location: {
    latitude: Number,
    longitude: Number,
  },
});

const busSchema = new mongoose.Schema({
  name: String,
  location: {
    latitude: Number,
    longitude: Number,
  },
});

const routeSchema = new mongoose.Schema({
  title: String,
  stops: [
    {
      name: String
    }
  ]
});

const busRouteSchema = new mongoose.Schema({
  busName: String,
  route: {
    title: String,
    stops: [
      {
        name: String,
        location: {
          latitude: Number,
          longitude: Number,
        }
      }
    ]
  }
});

// Define models
const Stop = mongoose.model('Stop', stopSchema);
const Bus = mongoose.model('Bus', busSchema);
const Route = mongoose.model('Route', routeSchema);
const BusRoute = mongoose.model('BusRoute', busRouteSchema);

// Routes for BusTracker app
app.post('/add-stop', async (req, res) => {
  const { name, longitude, latitude } = req.body;
  const stop = new Stop({ name, location: { longitude, latitude } });
  await stop.save();
  res.send(stop);
});

app.delete('/delete-stop/:id', async (req, res) => {
  const { id } = req.params;
  await Stop.findByIdAndDelete(id);
  res.send({ message: 'Stop deleted successfully' });
});

app.post('/add-route', async (req, res) => {
  const { title, stops } = req.body;

  try {
    const route = new Route({
      title,
      stops: stops.map(stop => ({
        name: stop.name
      }))
    });
    await route.save();
    res.send(route);
  } catch (error) {
    res.status(500).json({ message: 'Error adding route', error });
  }
});

app.post('/add-bus', async (req, res) => {
  const { name, routeId } = req.body;

  try {
    const route = await Route.findById(routeId);

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    // Save to Bus collection
    const bus = new Bus({ name });
    await bus.save();

    // Save to BusRoute collection
    const busRoute = new BusRoute({
      busName: name,
      route: {
        title: route.title,
        stops: route.stops.map(stop => ({
          name: stop.name,
          location: stop.location,
        })),
      }
    });
    await busRoute.save();

    res.send({ bus, busRoute });
  } catch (error) {
    res.status(500).json({ message: 'Error adding bus', error });
  }
});

app.post('/update-location', async (req, res) => {
  const { name, latitude, longitude } = req.body;
  const bus = await Bus.findOneAndUpdate(
    { name },
    { location: { latitude, longitude } },
    { new: true }
  );
  res.send(bus);
});

app.get('/buses', async (req, res) => {
  const buses = await Bus.find();
  res.send(buses);
});

app.delete('/delete-bus/:id', async (req, res) => {
  const { id } = req.params;
  await Bus.findByIdAndDelete(id);
  res.send({ message: 'Bus deleted successfully' });
});

app.get('/stops', async (req, res) => {
  const stops = await Stop.find();
  res.send(stops);
});

app.get('/routes', async (req, res) => {
  try {
    const routes = await Route.find();
    res.send(routes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).send('Internal Server Error');
  }
});

// New routes for WIMB app

// Search buses between two stops
app.post('/search-buses', async (req, res) => {
  const { from, to } = req.body;
  try {
    const buses = await BusRoute.find({
      'route.stops.name': { $all: [from, to] }
    });

    if (buses.length === 0) {
      return res.status(404).json({ message: 'No buses found for the given route' });
    }

    res.send(buses);
  } catch (error) {
    console.error('Error searching buses:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Get live location of a bus
app.get('/bus-details/name/:name', async (req, res) => {
  try {
      const busName = req.params.name;
      const busDetails = await Bus.findOne({ name: busName }).exec();
      if (!busDetails) {
          return res.status(404).json({ message: 'Bus not found' });
      }
      res.json(busDetails);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

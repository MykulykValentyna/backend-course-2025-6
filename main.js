const express = require('express');
const { program } = require('commander');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

program
  .requiredOption('-h, --host <host>', 'Адреса сервера')
  .requiredOption('-p, --port <port>', 'Порт сервера', parseInt)
  .requiredOption('-c, --cache <path>', 'Шлях до директорії для кешування файлів');
program.parse(process.argv);
const { host, port, cache } = program.opts();

if (!fs.existsSync(cache)) {
    fs.mkdirSync(cache, { recursive: true });
}

const app = express();
const absoluteCachePath = path.resolve(cache);
const upload = multer({ dest: absoluteCachePath });
const inventoryList = [];
let nextId = 1;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const getPhotoUrl = (id) => `/inventory/${id}/photo`;

app.post('/register', upload.single('photo'), (req, res) => {
    const { inventory_name, description } = req.body;
    if (!inventory_name) {
        return res.status(400).send({ error: 'Поле inventory_name є обов\'язковим.' });
    }
    const newInventory = {
        ID: nextId++,
        InventoryName: inventory_name,
        Description: description || '',
        PhotoFilename: req.file ? req.file.filename : null,
        PhotoUrl: req.file ? getPhotoUrl(nextId - 1) : null
    };
    inventoryList.push(newInventory);
    res.status(201).json(newInventory);
});

app.get('/inventory', (req, res) => {
    res.status(200).json(inventoryList.map(item => ({
        ...item,
        PhotoUrl: item.PhotoFilename ? getPhotoUrl(item.ID) : null
    })));
});

app.get('/inventory/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = inventoryList.find(i => i.ID === id);
    if (!item) {
        return res.status(404).send({ error: 'Річ з таким ID не знайдена.' });
    }
    res.status(200).json({
        ...item,
        PhotoUrl: item.PhotoFilename ? getPhotoUrl(id) : null
    });
});

app.put('/inventory/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = inventoryList.find(i => i.ID === id);
    if (!item) {
        return res.status(404).send({ error: 'Річ з таким ID не знайдена.' });
    }
    const { inventory_name, description } = req.body;
    if (inventory_name !== undefined) item.InventoryName = inventory_name;
    if (description !== undefined) item.Description = description;
    res.status(200).json(item);
});

app.get('/inventory/:id/photo', (req, res) => {
    const id = parseInt(req.params.id);
    const item = inventoryList.find(i => i.ID === id);
    if (!item || !item.PhotoFilename) {
        return res.status(404).send({ error: 'Фото або річ з таким ID не знайдена.' });
    }
    const filePath = path.join(absoluteCachePath, item.PhotoFilename);
    if (!fs.existsSync(filePath)) {
         return res.status(404).send({ error: 'Файл фото відсутній у кеші.' });
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.status(200).sendFile(filePath);
});

app.put('/inventory/:id/photo', upload.single('photo'), (req, res) => {
    const id = parseInt(req.params.id);
    const item = inventoryList.find(i => i.ID === id);
    if (!item) {
        return res.status(404).send({ error: 'Річ з таким ID не знайдена.' });
    }
    if (!req.file) {
        return res.status(400).send({ error: 'Файл фото не надано.' });
    }
    item.PhotoFilename = req.file.filename;
    item.PhotoUrl = getPhotoUrl(id);
    res.status(200).json(item);
});

app.delete('/inventory/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = inventoryList.findIndex(i => i.ID === id);
    if (index === -1) {
        return res.status(404).send({ error: 'Річ з таким ID не знайдена.' });
    }
    inventoryList.splice(index, 1);
    res.status(200).send({ message: `Річ з ID ${id} успішно видалена.` });
});

app.get('/RegisterForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

app.get('/SearchForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'SearchForm.html'));
});

app.post('/search', (req, res) => {
    const { id, includePhoto } = req.body;
    const searchId = parseInt(id);
    if (isNaN(searchId)) {
        return res.status(400).send({ error: 'Недійсний ID для пошуку.' });
    }
    const item = inventoryList.find(i => i.ID === searchId);
    if (!item) {
        return res.status(404).send({ error: `Річ з ID ${id} не знайдена.` });
    }
    const responseData = {
        ID: item.ID,
        InventoryName: item.InventoryName,
        Description: item.Description
    };
    if (includePhoto === 'on' && item.PhotoFilename) {
        responseData.PhotoUrl = getPhotoUrl(item.ID);
    }
    res.status(200).json(responseData);
});

app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
        return res.status(405).send({ error: 'Метод не дозволено (Method not allowed)' });
    }
    res.status(404).send({ error: 'Ресурс не знайдено' });
});

app.listen(port, host, () => {
    console.log(`Сервер запущено на http://${host}:${port}`);
    console.log(`Кеш-директорія: ${cache}`);
});
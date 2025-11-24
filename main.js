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
const upload = multer({ dest: cache });
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

app.listen(port, host, () => {
    console.log(`Сервер запущено на http://${host}:${port}`);
    console.log(`Кеш-директорія: ${cache}`);
});
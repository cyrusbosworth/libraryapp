const express = require('express');
const router = express.Router();
const Book = require('../models/book');
const axios = require('axios');
const googleApi = 'https://www.googleapis.com/books/v1/volumes';

router.get('/', async (req, res) => {
	let books = [];
	try {
		books = await Book.find()
			.sort({ createdAtDate: 'desc' })
			.limit(10)
			.exec();
	} catch (err) {
		console.log(err);
		books = [];
	}
	res.render('index', { books: books });
});

router.get('/websearch', async (req, res) => {
	const author = req.query.author ? `inauthor:${req.query.author.trim()}` : '';
	const title = req.query.title ? `intitle:${req.query.title.trim()}` : '';
	if (!author && !title) {
		console.log('cant be empty');
		res.redirect('/');
	}
	const query = encodeURI(`${author} ${title}`);
	const search = `${googleApi}?q=${query}&printType=books&maxResults=40`;
	const response = await axios.get(search);

	const books = [];

	for (item of response.data.items) {
		const book = {
			title: item.volumeInfo.title,
			description: item.volumeInfo.description,
			date: item.volumeInfo.publishedDate,
			pageCount: item.volumeInfo.pageCount,
			author: item.volumeInfo.authors ? item.volumeInfo.authors[0] : '',
			cover: item.volumeInfo.imageLinks ? item.volumeInfo.imageLinks.thumbnail : '',
			apiId: item.id
		};
		//check for empty values from api
		if (Object.values(book).every(item => item)) {
			book.descBlurb =
				item.volumeInfo.description.length > 600
					? item.volumeInfo.description.substr(0, 600) + '...'
					: item.volumeInfo.description;
			books.push(book);
		}
	}

	res.render('searchResults', {
		books: books,
		author: req.query.author,
		title: req.query.title
	});
});

module.exports = router;

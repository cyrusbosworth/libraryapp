const express = require('express');
const router = express.Router();
const Book = require('../models/book');
const Author = require('../models/author');

const axios = require('axios');

const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

//All Books Route

router.get('/', async (req, res) => {
	let query = Book.find();
	if (req.query.title) {
		query = query.regex('title', new RegExp(req.query.title, 'i'));
	}
	if (req.query.publishedBefore) {
		query = query.lte('publishDate', req.query.publishedBefore);
	}
	if (req.query.publishedAfter) {
		query = query.gte('publishDate', req.query.publishedAfter);
	}
	try {
		const books = await query.sort({ createdAtDate: 'desc' }).exec();

		res.render('books/index', { books: books, searchOptions: req.query });
	} catch (err) {
		console.log(err);
		res.redirect('/');
	}
});

// New Book Route
router.get('/new', async (req, res) => {
	renderNewPage(res, new Book());
});

async function getAuthorId(author) {
	const bookAuthor = await Author.findOne({ name: author });

	if (bookAuthor) {
		return bookAuthor.id;
	} else {
		const newAuthor = new Author({
			name: author
		});
		try {
			const createdAuthor = await newAuthor.save();
			return createdAuthor.id;
		} catch (err) {
			console.log(err);
		}
	}
}

//Create Book
router.post('/', async (req, res) => {
	const authorId = await getAuthorId(req.body.author);

	const book = new Book({
		title: req.body.title,
		author: authorId,
		publishDate: new Date(req.body.publishDate),
		pageCount: req.body.pageCount,
		description: req.body.description
	});

	if (req.body.cover) saveCover(book, req.body.cover);

	if (req.body.apiId) {
		const bookDetail = await axios.get(
			`https://www.googleapis.com/books/v1/volumes/${req.body.apiId}`
		);

		const image = await axios.get(
			bookDetail.data.volumeInfo.imageLinks.medium ||
				bookDetail.data.volumeInfo.imageLinks.thumbnail,
			{
				responseType: 'arraybuffer'
			}
		);

		book.coverImage = new Buffer.from(image.data, 'base64');

		book.coverImageType = 'image/jpeg';
	}
	try {
		const newBook = await book.save();
		res.redirect(`/books/${newBook.id}`);
	} catch (err) {
		renderNewPage(res, book, true);
	}
});

//Show Book Route
router.get('/:id', async (req, res) => {
	try {
		const book = await Book.findById(req.params.id)
			.populate('author')
			.exec();

		res.render('books/show', { book: book, errorMessage: '' });
	} catch (err) {
		console.log(err);
		res.redirect('/');
	}
});
//Edit Book Route
router.get('/:id/edit', async (req, res) => {
	try {
		const book = await Book.findById(req.params.id);
		renderEditPage(res, book);
	} catch (err) {
		console.log(err);
		res.redirect('/');
	}
});
router.delete('/:id', async (req, res) => {
	let book;
	try {
		book = await Book.findById(req.params.id);
		await book.remove();
		res.redirect('/books');
	} catch {
		if (book) {
			res.render('books/show', { book: book, errorMessage: 'Could not remove book' });
		} else {
			res.redirect('/');
		}
	}
});
//Update Book Route
router.put('/:id', async (req, res) => {
	let book;
	console.log(req.params);
	try {
		book = await Book.findById(req.params.id);
		book.title = req.body.title;
		book.author = await getAuthorId(req.body.author);
		book.publishDate = new Date(req.body.publishDate);
		book.pageCount = req.body.pageCount;
		book.description = req.body.description;
		console.log(book);
		if (req.body.cover) {
			saveCover(book, req.body.cover);
		}
		await book.save();
		res.redirect(`/books/${book.id}`);
	} catch {
		if (book) renderEditPage(res, book, true);
		else redirect('/');
	}
});

function saveCover(book, coverEncoded) {
	if (coverEncoded == null) return;
	const cover = JSON.parse(coverEncoded);
	if (cover != null && imageMimeTypes.includes(cover.type)) {
		book.coverImage = new Buffer.from(cover.data, 'base64');
		book.coverImageType = cover.type;
	}
}

async function renderNewPage(res, book, hasError = false) {
	renderFormPage(res, book, 'new', hasError);
}

async function renderEditPage(res, book, hasError = false) {
	renderFormPage(res, book, 'edit', hasError);
}

async function renderFormPage(res, book, form, hasError = false) {
	try {
		const authors = await Author.find({});

		const params = {
			authors: authors,
			book: book,
			bookAuthor: ''
		};

		if (form === 'edit') {
			const bookAuthor = await Author.findById(book.author);
			params.bookAuthor = bookAuthor;
		}

		if (hasError) {
			if (form === 'edit')
				params.errorMessage = 'Error editing book, please enter book information';
			else params.errorMessage = 'Error creating book, please enter book information.';
		}
		res.render(`books/${form}`, params);
	} catch {
		res.redirect('/books');
	}
}
module.exports = router;

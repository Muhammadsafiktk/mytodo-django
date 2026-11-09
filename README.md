
# mytodo-django

# Focus — Premium Todo List App

A polished, production-ready Todo application built with **Django**, **HTML**, **CSS**, and **vanilla JavaScript**.

Inspired by modern tools like Linear, Notion, and Arc — clean design, smooth interactions, dark/light mode, drag-and-drop, and full CRUD.

## Features

- Full CRUD for tasks (title, description, priority, due date)
- Toggle complete / incomplete with animated checkboxes
- Priority badges (Low / Medium / High) with color coding
- Overdue highlighting
- Live filters: All / Active / Completed
- Real-time search
- Drag-and-drop reordering
- Dark mode + Light mode (persisted in localStorage)
- Smooth animations & micro-interactions
- Fully responsive (mobile, tablet, desktop)
- Keyboard support (Enter to add, Escape to close modal, `/` to focus search)
- CSRF-protected AJAX requests
- Empty state illustration
- Accessible markup (ARIA, labels, keyboard navigation)

## Tech Stack

- **Backend:** Django 6.x
- **Frontend:** Semantic HTML, modern CSS (custom properties, glassmorphism accents), vanilla JS (Fetch API)
- **Database:** SQLite (default)

## Project Structure

```
todo_project/          # Django project settings
todos/                 # Main app
  models.py            # Todo model
  views.py             # CRUD + reorder views
  forms.py             # ModelForm
  urls.py
  admin.py
templates/todos/
  index.html           # Single-page UI
static/
  css/styles.css       # Complete design system
  js/app.js            # Interactive frontend
manage.py
README.md
```

## Installation & Setup

### 1. Prerequisites

- Python 3.10+
- pip

### 2. Create virtual environment (recommended)

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

### 3. Install Django

```bash
pip install django
```

### 4. Clone / place project files

Ensure you have the full project structure above.

### 5. Configure database (optional)

By default SQLite is used. In `todo_project/settings.py` you can change:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### 6. Run migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. (Optional) Create superuser for admin

```bash
python manage.py createsuperuser
```

Then visit `/admin/` to manage todos.

### 8. Collect static files (production)

```bash
python manage.py collectstatic
```

### 9. Run the development server

```bash
python manage.py runserver
```

Open **http://127.0.0.1:8000/**

## Production Notes

- Set `DEBUG = False`
- Configure a strong `SECRET_KEY`
- Set `ALLOWED_HOSTS`
- Use a production database (PostgreSQL recommended)
- Serve static files via WhiteNoise or a CDN
- Run behind Gunicorn / uWSGI + Nginx

Example with WhiteNoise:

```bash
pip install whitenoise
```

Add to `MIDDLEWARE` (near the top):

```python
'whitenoise.middleware.WhiteNoiseMiddleware',
```

## Usage Tips

| Action              | How                                      |
|---------------------|------------------------------------------|
| Add task            | Type title → Enter (or click +)          |
| More options        | Click "More options" for description, priority, due date |
| Complete task       | Click the checkbox                       |
| Edit                | Hover → pencil icon                      |
| Delete              | Hover → trash icon                       |
| Reorder             | Drag the grip handle                     |
| Filter              | Use All / Active / Completed pills or click stats |
| Search              | Type in search box or press `/`          |
| Toggle theme        | Click sun/moon icon in header            |

## License

MIT — feel free to use and adapt.


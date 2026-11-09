from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_POST, require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Max
from .models import Todo
from .forms import TodoForm
import json


@ensure_csrf_cookie
def index(request):
    """Main todo list view."""
    todos = Todo.objects.all()
    form = TodoForm()
    context = {
        'todos': todos,
        'form': form,
        'total_count': todos.count(),
        'active_count': todos.filter(completed=False).count(),
        'completed_count': todos.filter(completed=True).count(),
    }
    return render(request, 'todos/index.html', context)


@require_POST
def create_todo(request):
    """Create a new todo via form or AJAX."""
    form = TodoForm(request.POST)
    if form.is_valid():
        todo = form.save(commit=False)
        max_order = Todo.objects.aggregate(Max('order'))['order__max'] or 0
        todo.order = max_order + 1
        todo.save()
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({
                'success': True,
                'todo': serialize_todo(todo),
            })
        return redirect('index')
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    return redirect('index')


@require_http_methods(["POST", "PUT"])
def update_todo(request, pk):
    """Update an existing todo."""
    todo = get_object_or_404(Todo, pk=pk)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            data = request.POST
        form = TodoForm(data, instance=todo)
        if form.is_valid():
            form.save()
            return JsonResponse({'success': True, 'todo': serialize_todo(todo)})
        return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    form = TodoForm(request.POST, instance=todo)
    if form.is_valid():
        form.save()
    return redirect('index')


@require_POST
def toggle_todo(request, pk):
    """Toggle completed status."""
    todo = get_object_or_404(Todo, pk=pk)
    todo.completed = not todo.completed
    todo.save()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True, 'todo': serialize_todo(todo)})
    return redirect('index')


@require_http_methods(["POST", "DELETE"])
def delete_todo(request, pk):
    """Delete a todo."""
    todo = get_object_or_404(Todo, pk=pk)
    todo.delete()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True})
    return redirect('index')


@require_POST
def reorder_todos(request):
    """Reorder todos via drag-and-drop."""
    if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
        return HttpResponseBadRequest()
    try:
        data = json.loads(request.body)
        order_list = data.get('order', [])
        for index, todo_id in enumerate(order_list):
            Todo.objects.filter(pk=todo_id).update(order=index)
        return JsonResponse({'success': True})
    except (json.JSONDecodeError, ValueError, TypeError):
        return JsonResponse({'success': False}, status=400)


def serialize_todo(todo):
    """Serialize a Todo instance to dict."""
    return {
        'id': todo.id,
        'title': todo.title,
        'description': todo.description or '',
        'completed': todo.completed,
        'priority': todo.priority,
        'priority_display': todo.priority_display,
        'due_date': todo.due_date.isoformat() if todo.due_date else None,
        'is_overdue': todo.is_overdue,
        'created_at': todo.created_at.isoformat(),
        'order': todo.order,
    }

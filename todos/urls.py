from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('create/', views.create_todo, name='create_todo'),
    path('<int:pk>/update/', views.update_todo, name='update_todo'),
    path('<int:pk>/toggle/', views.toggle_todo, name='toggle_todo'),
    path('<int:pk>/delete/', views.delete_todo, name='delete_todo'),
    path('reorder/', views.reorder_todos, name='reorder_todos'),
]

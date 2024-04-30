from js import requestAnimationFrame
import math
from pyodide import create_proxy
canvas = document.getElementById('canvas')
ctx = canvas.getContext('2d')

class Circle:
    def __init__(self, x, y, radius, color):
        self.x = x
        self.y = y
        self.radius = radius
        self.color = color
        self.vx = 3
        self.vy = 5
        self.friction = 0.8
        
        
    def draw(self):
        ctx.beginPath()
        ctx.fillStyle =self.color
        ctx.arc(self.x, self.y, self.radius, 0, math.pi*2)
        ctx.closePath()
        ctx.fill()
    
    def update(self):
        if canvas.height < self.y + self.vy + self.radius:
            self.vy *= -self.friction
        else:
            self.vy += 1

        
        if self.y - -self.vy - self.radius < 0:
            self.vy *= -self.friction
        
        if canvas.width < self.x + self.vx + self.radius:
            self.vx *= -self.friction
            
        if self.x -self.radius + self.vx < 0:
            self.vx *= -self.friction
        
        self.x += self.vx
        self.y += self.vy
        
circle = Circle(100, 100, 100, '#00f')
def animate(e):
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    circle.update()
    circle.draw()
    requestAnimationFrame(create_proxy(animate))
animate(1)

package main

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/log"
	"github.com/charmbracelet/ssh"
	"github.com/charmbracelet/wish"
	"github.com/charmbracelet/wish/bubbletea"
	"github.com/muesli/termenv"
)

type Shape struct {
	x, y   float64
	vx, vy float64
	form   int
	color  lipgloss.Color
	label  string
}

var shapeChars = []string{"█", "◆", "●", "▓"}

var pageColors = []lipgloss.Color{
	lipgloss.Color("#D60270"), // about
	lipgloss.Color("#9B4F96"), // projects
	lipgloss.Color("#0038A8"), // experience
	lipgloss.Color("#069494"), // misc
}

var pageLabels = []string{"about", "projects", "experience", "misc"}

type tickMsg time.Time

type model struct {
	width       int
	height      int
	shapes      []Shape
	currentPage string
}

func initialModel() model {
	shapes := make([]Shape, 4)
	for i := 0; i < 4; i++ {
		shapes[i] = Shape{
			x:     float64(rand.Intn(60) + 10),
			y:     float64(rand.Intn(15) + 3),
			vx:    float64(rand.Intn(3)-1) + 0.5,
			vy:    float64(rand.Intn(3)-1) + 0.5,
			form:  i % len(shapeChars),
			color: pageColors[i],
			label: pageLabels[i],
		}
		if shapes[i].vx == 0 {
			shapes[i].vx = 1
		}
		if shapes[i].vy == 0 {
			shapes[i].vy = 1
		}
	}
	return model{
		width:       80,
		height:      24,
		shapes:      shapes,
		currentPage: "",
	}
}

func tickCmd() tea.Cmd {
	return tea.Tick(time.Millisecond*50, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m model) Init() tea.Cmd {
	return tickCmd()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "1":
			m.currentPage = "about"
		case "2":
			m.currentPage = "projects"
		case "3":
			m.currentPage = "experience"
		case "4":
			m.currentPage = "misc"
		case "b", "esc":
			m.currentPage = ""
		}
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	case tickMsg:
		for i := range m.shapes {
			m.shapes[i].x += m.shapes[i].vx
			m.shapes[i].y += m.shapes[i].vy

			morphed := false

			// Left/right edge (shape is 5 chars wide)
			if m.shapes[i].x <= 0 {
				m.shapes[i].x = 0
				m.shapes[i].vx *= -1
				morphed = true
			} else if m.shapes[i].x >= float64(m.width-5) {
				m.shapes[i].x = float64(m.width - 5)
				m.shapes[i].vx *= -1
				morphed = true
			}

			// Top/bottom edge (shape is 3 chars tall, leave 2 rows for footer)
			if m.shapes[i].y <= 1 {
				m.shapes[i].y = 1
				m.shapes[i].vy *= -1
				morphed = true
			} else if m.shapes[i].y >= float64(m.height-5) {
				m.shapes[i].y = float64(m.height - 5)
				m.shapes[i].vy *= -1
				morphed = true
			}

			if morphed {
				m.shapes[i].form = (m.shapes[i].form + 1) % len(shapeChars)
			}
		}
		return m, tickCmd()
	}
	return m, nil
}

func (m model) View() string {
	if m.currentPage != "" {
		return m.renderPage()
	}
	return m.renderHome()
}

func (m model) renderHome() string {
	bgStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#3a3a3a"))

	lines := make([][]rune, m.height)
	bgText := "vedsite "
	for y := 0; y < m.height; y++ {
		line := make([]rune, m.width)
		for x := 0; x < m.width; x++ {
			charIdx := (x + y*3) % len(bgText)
			line[x] = rune(bgText[charIdx])
		}
		lines[y] = line
	}

	for _, shape := range m.shapes {
		sx := int(shape.x)
		sy := int(shape.y)
		char := shapeChars[shape.form]

		for dy := 0; dy < 3; dy++ {
			for dx := 0; dx < 5; dx++ {
				py := sy + dy
				px := sx + dx
				if py >= 0 && py < m.height && px >= 0 && px < m.width {
					lines[py][px] = rune(char[0])
				}
			}
		}
	}

	var output strings.Builder
	for y, line := range lines {
		for x, ch := range line {
			colored := false
			for _, shape := range m.shapes {
				sx, sy := int(shape.x), int(shape.y)
				if x >= sx && x < sx+5 && y >= sy && y < sy+3 {
					style := lipgloss.NewStyle().Foreground(shape.color).Bold(true)
					output.WriteString(style.Render(string(ch)))
					colored = true
					break
				}
			}
			if !colored {
				output.WriteString(bgStyle.Render(string(ch)))
			}
		}
		output.WriteString("\n")
	}

	footerStyle := lipgloss.NewStyle().
		Foreground(lipgloss.Color("#ffffff")).
		Background(lipgloss.Color("#1a1a1a")).
		Padding(0, 1)

	footer := footerStyle.Render("[1] about  [2] projects  [3] experience  [4] misc  [q] quit")
	output.WriteString("\n" + footer)

	return output.String()
}

func (m model) renderPage() string {
	var color lipgloss.Color
	var title string

	switch m.currentPage {
	case "about":
		color = pageColors[0]
		title = "ABOUT"
	case "projects":
		color = pageColors[1]
		title = "PROJECTS"
		body = `► SSH Portfolio
         Terminal-accessible portfolio via SSH

       ► NEU SquashHub
         Attendance service for NEU Club Squash

       ► Premier League Performance Analysis
         Selenium scraping & data visualization

       ► Sanguine Strategy Card Game
         Turn-based card game, based on Queen's Blood

       ► Light-Em-All Logic Game
         Grid puzzle with pathfinding algorithms

       ► Boston Carbon Neutrality Simulation
         Urban carbon reduction modeling`
	case "experience":
		color = pageColors[2]
		title = "EXPERIENCE"
	case "misc":
		color = pageColors[3]
		title = "MISC"
	}

	style := lipgloss.NewStyle().Foreground(color)
	dimStyle := lipgloss.NewStyle().Foreground(lipgloss.Color("#888888"))

	content := fmt.Sprintf(`
  ╔══════════════════════════════════════╗
  ║            %-26s║
  ╠══════════════════════════════════════╣
  ║                                      ║
  ║       Coming soon...                 ║
  ║                                      ║
  ║       Visit vedsite.com/%s
  ║                                      ║
  ╚══════════════════════════════════════╝`, title, m.currentPage)

	footer := dimStyle.Render("\n\n  [b] back  [q] quit")

	return style.Render(content) + footer
}

func main() {
	lipgloss.SetColorProfile(termenv.TrueColor)
	host := "0.0.0.0"
	port := 22

	srv, err := wish.NewServer(
		wish.WithAddress(fmt.Sprintf("%s:%d", host, port)),
		wish.WithHostKeyPath(".ssh/host_ed25519"),
		wish.WithMiddleware(
			bubbletea.Middleware(func(s ssh.Session) (tea.Model, []tea.ProgramOption) {
				return initialModel(), []tea.ProgramOption{tea.WithAltScreen()}
			}),
		),
	)
	if err != nil {
		log.Error("Could not create server", "error", err)
		os.Exit(1)
	}

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	log.Info("Starting SSH server", "host", host, "port", port)
	go func() {
		if err := srv.ListenAndServe(); err != nil {
			log.Error("Server error", "error", err)
		}
	}()

	<-done
	log.Info("Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("Shutdown error", "error", err)
	}
}

// Command Azuos Agent mantém só a entrada e o contrato de bindings do Wails.
package main

import (
	"embed"

	"github.com/grupo-azuos/chamados/chamados/agent/src-go/app/desktop"
	ipc "github.com/grupo-azuos/chamados/chamados/agent/src-go/lib/ipc/wails"
)

//go:embed all:svelte/dist
var assets embed.FS

// App preserva window.go.main.App para os bindings existentes do frontend.
type App struct{ *ipc.Bindings }

func main() {
	backend := desktop.NewApp()
	app := &App{Bindings: ipc.New(backend)}
	desktop.Run(assets, backend, app)
}

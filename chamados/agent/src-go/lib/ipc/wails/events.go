package wails

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/grupo-azuos/chamados/chamados/agent/src-go/modules/metrics"
)

func EmitSnapshot(ctx context.Context, snapshot metrics.Snapshot) {
	runtime.EventsEmit(ctx, "metrics:snapshot", snapshot)
}
func EmitViewChange(ctx context.Context, view string) {
	runtime.EventsEmit(ctx, "view:change", view)
}
func EmitWindowShown(ctx context.Context, view string) {
	runtime.EventsEmit(ctx, "window:shown", view)
}

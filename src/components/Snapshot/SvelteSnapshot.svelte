<script lang="ts">
    import { Visualizer } from "@viamrobotics/visualization";
    import { Snapshot, SnapshotProto } from "@viamrobotics/visualization/lib";
    import { WorldTree } from "@viamrobotics/visualization/plugins";
    import { ViamProvider } from "@viamrobotics/svelte-sdk";
    import { Struct } from "@viamrobotics/sdk";
    import { T } from "@threlte/core";

    interface SvelteSnapshotProps {
        snapshot: SnapshotProto;
    }
    const { snapshot }: SvelteSnapshotProps = $props();

    // Realistic mode lights with one shadow-casting key light and no ambient, so the
    // obstacles' full-strength shadows black out large parts of the workcell. Ambient
    // lifts shadowed and back-facing surfaces evenly; raise it to brighten the scene.
    const AMBIENT_FILL_INTENSITY = 1.5;


  </script>
  
  <ViamProvider dialConfigs={{}}>
    <Visualizer
					localConfigProps={{
						current: new Struct(),
						setLocalPartConfig: () => {},
						isDirty: false,
					}}
				>
        <Snapshot snapshot={snapshot} />
        <!-- Visualizer 2.x mounts no overlays itself; the tree is an opt-in plugin -->
        <WorldTree />
        <T.AmbientLight intensity={AMBIENT_FILL_INTENSITY} />
    </Visualizer>
  </ViamProvider>
  
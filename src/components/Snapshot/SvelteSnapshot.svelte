<script lang="ts">
    import { Visualizer } from "@viamrobotics/visualization";
    import { Snapshot, SnapshotProto } from "@viamrobotics/visualization/lib";
    import { ViamProvider } from "@viamrobotics/svelte-sdk";
    import { Struct } from "@viamrobotics/sdk";

    interface SvelteSnapshotProps {
        snapshot: SnapshotProto;
    }
    const { snapshot }: SvelteSnapshotProps = $props();
  

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
    </Visualizer>
  </ViamProvider>
  
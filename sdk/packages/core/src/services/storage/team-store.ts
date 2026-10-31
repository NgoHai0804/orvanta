export type { TeamStore } from "../../types/storage";
export {
	FileTeamStore,
	type FileTeamStoreOptions,
} from "./file-team-store";
export {
	SqliteTeamStore,
	type SqliteTeamStoreOptions,
} from "./sqlite-team-store";

import { FileTeamStore } from "./file-team-store";
import {
	SqliteTeamStore,
	type SqliteTeamStoreOptions,
} from "./sqlite-team-store";

export function createLocalTeamStore(options: SqliteTeamStoreOptions = {}): {
	init(): void;
	listTeamNames(): string[];
	readState(teamName: string): ReturnType<FileTeamStore["readState"]>;
	readHistory(teamName: string, limit?: number): unknown[];
	loadRuntime(teamName: string): ReturnType<FileTeamStore["loadRuntime"]>;
	handleTeamEvent: FileTeamStore["handleTeamEvent"];
	persistBatch: FileTeamStore["persistBatch"];
	persistRuntime: FileTeamStore["persistRuntime"];
	markInProgressRunsInterrupted: FileTeamStore["markInProgressRunsInterrupted"];
	deleteTeam: FileTeamStore["deleteTeam"];
	close?: () => void;
} {
	if (options.failClosed && !options.teamDir) {
		throw new Error(
			"Fail-closed TeamStore requires an explicit project-owned directory",
		);
	}
	try {
		const store = new SqliteTeamStore(options);
		store.init();
		return store;
	} catch (error) {
		if (options.failClosed) {
			throw error;
		}
		const store = new FileTeamStore({ teamDir: options.teamDir });
		store.init();
		return store;
	}
}

// pouchdb-config.js
import PouchDB from "pouchdb-browser";
PouchDB.plugin(require("pouchdb-adapter-idb"));

const db = new PouchDB("incidencias-db", { adapter: "idb" });

export default db;

const preview = (drawing: string) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${drawing}</svg>`,
)}`;

export const itemPreviews = {
  ring: preview('<circle cx="20" cy="24" r="11" fill="none" stroke="#b8914b" stroke-width="5"/><path d="M14 8h12l3 7-9 7-9-7z" fill="#b63545" stroke="#dfbc72" stroke-width="2"/>'),
  armour: preview('<path d="M12 5l8 4 8-4 9 10-7 6-3-4v20H13V17l-3 4-7-6z" fill="#73727a" stroke="#c5ad79" stroke-width="2"/><path d="M20 11v22M14 20h12" stroke="#c5ad79" stroke-width="2"/>'),
  boots: preview('<path d="M10 4h12v21l9 5v6H7v-8l3-5z" fill="#70553d" stroke="#c5ad79" stroke-width="2"/><path d="M11 11h9M11 17h9M11 23h9" stroke="#c5ad79" stroke-width="2"/>'),
};

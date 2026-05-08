import api from "./core";

export const sirenControlAPI = {
  trigger: (data: { schoolId: string; type: string }) =>
    api.post("/api/siren/trigger", data, { skipAuthErrorRedirect: true }),
};

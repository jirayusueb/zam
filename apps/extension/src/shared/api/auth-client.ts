import { createAuthClient } from "better-auth/react";

import { WEB_URL } from "../config/env";

export const authClient = createAuthClient({ baseURL: WEB_URL });

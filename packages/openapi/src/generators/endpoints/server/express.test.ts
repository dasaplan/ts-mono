/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, test } from "vitest";
import { Endpoint } from "../Endpoint.js";

describe("express endpoint generator", () => {
  test("compiles types without error", async () => {
    interface GetPetEndpoint
      extends Endpoint<{
        200: { message: string };
        201: undefined;
      }> {
      name: "getPet";
      operation: "get";
      path: `/pets/{:petId}`;
    }

    interface UpdatePetEndpoint
      extends Endpoint<{
        200: { message: string };
        201: undefined;
      }> {
      name: "updatePet";
      operation: "put";
      path: `/pets/{:petId}`;
    }

    // no error
    const _a: GetPetEndpoint = {
      name: "getPet",
      operation: "get",
      path: `/pets/{:petId}`,
      response: {
        201: {
          payload: undefined,
          format: undefined,
        },
        200: {
          payload: {
            message: "",
          },
          format: undefined,
        },
      },
    };
  });
});

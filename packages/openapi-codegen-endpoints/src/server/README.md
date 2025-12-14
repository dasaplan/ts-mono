
---
feat(express-server): allow classes/objects for controller implementing the respective operation

---
feat(express-server): complete types with zod

---
feat(express-server): support errorMiddlewares in responseMiddlewares

---
feat(express-server): no longer generate unknown types for server (only for clients)

---
feat(express-server): 

When user implement the operation controller, the return errors are not good enough.
```typescript
export const loginUser: Operation["login"]["controller"] = async (req) => {
  
}

```

For better errors in concrete return statements, the return type must be declared.
However, currently it is a bit cumbersome to do because the controller currently returns a Promise or a Sync Result. 
If the function is async then the Result must be a Promise. 
There is a hack to Await the Result to narrow the type to Sync and then again wrap it. 
Not good... not good...
```typescript
export const loginUser: Operation["login"]["controller"] = async (req): Promise<Awaited<ReturnType<Operation["login"]["controller"]>>> => {
  
}

```
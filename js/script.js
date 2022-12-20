class ActionIsNotAnObject extends Error {
  constructor(action) {
    super(`Action should be an object but got ${kindOf(action)}`);
    this.name = "ActionIsNotAnObject";
  }
}

class ActionHasNoType extends Error {
  constructor() {
    super(`Action should have a type.`);
    this.name = "ActionHasNoType";
  }
}

class ActionHasNoTarget extends Error {
  constructor() {
    super(`Action should have a target.`);
    this.name = "ActionHasNoTarget";
  }
}

function createStore(reducer, initialState) {
  if (!isFunction(reducer)) {
    throw new Error(
      `Reducer should be a function, but got "${kindOf(reducer)}"`
    );
  }

  if (isFunction(initialState)) {
    throw new Error("InitialState couldn't be a function");
  }
  let state = initialState;
  let followers = [];
  let isDispatching = false;

  function dispatch(action) {
    if (!isObject(action)) {
      throw new ActionIsNotAnObject(action);
    }

    if (!("type" in action)) {
      throw new ActionHasNoType();
    }

    const isInitType = action.type === "@INIT";
    if (!isInitType && !("target" in action)) {
      throw new ActionHasNoTarget();
    }

    if (isDispatching) {
      throw new Error("Couldn't handle any other actions while processing");
    }

    try {
      isDispatching = true;
      state = reducer(state, action);
    } finally {
      isDispatching = false;
      broadcast();
    }
  }

  function broadcast() {
    for (const follow of followers) {
      follow();
    }
  }

  function getState() {
    if (isDispatching) {
      throw new Error(
        "Some Reducers may updating and are busy. please wait..."
      );
    }

    return state;
  }

  function follow(followFn) {
    followers.push(followFn);

    return function unfollow() {
      const nodeIndex = followers.indexOf(followFn);

      if (nodeIndex >= 0) {
        followers.splice(nodeIndex, 1);
      }
    };
  }

  dispatch({
    type: "@INIT",
  });

  return {
    dispatch,
    getState,
    follow,
  };
}

function shapeAssertionReducers(reducers) {
  Object.entries(reducers).forEach(([reducerKey, reducer]) => {
    const action = { type: "@INIT", target: reducerKey };
    const state = reducer(undefined, action);

    if (typeof state === "undefined") {
      throw new Error(
        `Reducer for key ${reducerKey} returns undefined for action ${JSON.stringify(
          action
        )}`
      );
    }

    const randomActionType = Math.random().toString(16).slice(2);
    const secondAction = { type: randomActionType, target: reducerKey };
    const secondState = reducer(undefined, secondAction);
    if (typeof secondState === "undefined") {
      throw new Error(
        `Reducer for key ${reducerKey} returns undefined for action ${JSON.stringify(
          secondAction
        )}`
      );
    }
  });
}

function combineReducers(reducers) {
  const finalReducers = {};

  for (const reducerKey in reducers) {
    const reducer = reducers[reducerKey];

    if (isFunction(reducer)) {
      finalReducers[reducerKey] = reducer;
    }
  }

  let shapeError;
  try {
    shapeAssertionReducers(finalReducers);
  } catch (e) {
    shapeError = e;
  }

  return (state = {}, action) => {
    if (shapeError) {
      throw shapeError;
    }

    let hasChanged = false;
    const nextState = state;
    if (action.type === "@INIT" || action.target === "*") {
      for (const reducerKey in finalReducers) {
        const reducer = finalReducers[reducerKey];
        const reducerState = state[reducerKey] || undefined;
        delete action.target;
        const newReducerState = reducer(reducerState, action);

        if (typeof newReducerState === "undefined") {
          throw new Error(
            `Reducer ${reducerKey} returns undefined for action's type ${action.type}.`
          );
        }

        hasChanged = hasChanged || reducerState !== newReducerState;

        nextState[reducerKey] = newReducerState;
      }
    } else {
      const reducerKey = action.target;
      if (!(reducerKey in finalReducers)) {
        throw new Error(`Target ${reducerKey} not found in reducers`);
      }
      const reducer = finalReducers[reducerKey];
      const reducerState = state[reducerKey] || undefined;
      delete action.target;
      const newReducerState = reducer(reducerState, action);

      if (typeof newReducerState === "undefined") {
        throw new Error(
          `Reducer ${reducerKey} returns undefined for action's type ${action.type}.`
        );
      }

      hasChanged = reducerState !== newReducerState;

      if (hasChanged) nextState[reducerKey] = newReducerState;
    }

    return hasChanged ? nextState : state;
  };
}

function kindOf(inp) {
  return Object.prototype.toString.call(inp).slice(8, -1).toLowerCase();
}

function isObject(inp) {
  return kindOf(inp) === "object";
}

function isFunction(inp) {
  return typeof inp === "function";
}

////////////////////////////////////////////
function toDoReducer(state = [], action) {
  switch (action.type) {
    case "ADD": {
      const id = "a" + Math.random().toString(16).slice(2); //id cant start with number
      return [
        ...state,
        {
          id,
          text: action.payload.text,
        },
      ];
    }
    case "DELETE": {
      const id = action.payload.id;
      const newList = state.filter((todo) => todo.id !== id);
      return newList;
    }
    case "DONE": {
      const id = action.payload.id;
      const pTextElm = action.payload.pElm.innerHTML;
      console.log("pTextElm",pTextElm)
      console.log("state",state)
      const newList = state.map((todo) => {
        if (todo.id === id) {
          const del = document.createElement("del");
          del.innerHTML = pTextElm;

          console.log("todo: ",todo)
          console.log("del: ",del)
          todo.text=del.outerHTML;
        }
        return todo;
      });
      console.log("newlist: ",newList)
      return newList;
    }
    default:
      return state;
  }
}

const store = createStore(
  combineReducers({
    toDo: toDoReducer,
  })
);

//////////////////////////////////
window.onload = function () {
  const ulElm = document.createElement("ul");
  ulElm.classList = "list-unstyled p-3 todo-list";
  document.querySelector(".todo-body").appendChild(ulElm);
};

function createToDo({ id, text }) {
  const listElm = document.querySelector(" ul.todo-list");

  const li = document.createElement("li");
  li.classList.add("todo-item");
  li.setAttribute("id", id);

  const input = document.createElement("input");
  input.classList = "form-check-input todo-checkbox";
  input.setAttribute("type", "checkbox");
  input.addEventListener("change", (event) => {
    const id = event.target.parentNode.id;
    const pElm = event.target.nextSibling;
    console.log(event.target.checked)
    if (event.target.checked) {
      console.log("check shood");

      store.dispatch({
        type: "DONE",
        target: "toDo",
        payload: {
          id,
         pElm,
        },
      });
    } else {
      console.log("uncheck shood");
    }
  });

  const p = document.createElement("p");
  p.classList.add("todo-text");
  const pText = document.createTextNode(text);
  p.append(pText);

  const button = document.createElement("button");
  button.classList = "form-control todo-delete";
  button.textContent = "X";
  button.addEventListener("click", (event) => {
    const id = event.target.parentNode.id;
    store.dispatch({
      type: "DELETE",
      target: "toDo",
      payload: {
        id,
      },
    });
  });

  li.append(input);
  li.append(p);
  li.append(button);

  listElm.append(li);
  document.querySelector("#todo-input").value = "";
}
const addToDoElm = document.querySelector(".add-button");
addToDoElm.addEventListener("click", () => {
  const toDoText = document.querySelector("#todo-input").value;
  if (toDoText != "") {
    store.dispatch({
      type: "ADD",
      target: "toDo",
      payload: {
        text: toDoText,
      },
    });
  }
});

const unfollow = store.follow(() => {
  rendertoDos(store.getState().toDo);
});

function rendertoDos(list) {
  document.querySelector("ul.todo-list").innerHTML = "";
  for (const toDo of list) {
    createToDo({
      id: toDo.id,
      text: toDo.text,
    });
  }
}
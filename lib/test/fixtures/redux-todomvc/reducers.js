import { combineReducers } from 'redux';
import { assign } from 'lodash';
import { ADD_TODO, DELETE_TODO, EDIT_TODO, COMPLETE_TODO, COMPLETE_ALL, CLEAR_COMPLETED } from './types';
var initialState = [
    {
        text: 'Use Redux',
        completed: false,
        id: 0,
    },
];
function todos(state, action) {
    if (state === void 0) { state = initialState; }
    switch (action.type) {
        case ADD_TODO:
            return [
                {
                    id: state.reduce(function (maxId, todo) { return Math.max(todo.id, maxId); }, -1) + 1,
                    completed: false,
                    text: action.text
                }
            ].concat(state);
        case DELETE_TODO:
            return state.filter(function (todo) {
                return todo.id !== action.id;
            });
        case EDIT_TODO:
            return state.map(function (todo) {
                return todo.id === action.id ?
                    assign({}, todo, { text: action.text }) :
                    todo;
            });
        case COMPLETE_TODO:
            return state.map(function (todo) {
                return todo.id === action.id ?
                    assign({}, todo, { completed: !todo.completed }) :
                    todo;
            });
        case COMPLETE_ALL:
            var areAllMarked_1 = state.every(function (todo) { return todo.completed; });
            return state.map(function (todo) { return assign({}, todo, {
                completed: !areAllMarked_1
            }); });
        case CLEAR_COMPLETED:
            return state.filter(function (todo) { return todo.completed === false; });
        default:
            return state;
    }
}
var rootReducer = combineReducers({
    todos: todos
});
export { rootReducer };
//# sourceMappingURL=reducers.js.map
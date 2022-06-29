import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function Drop() {
  return (
    <Droppable droppableId="list">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          style={{
            backgroundColor: provided.isDragging ? 'green' : 'lightblue'
          }}
          {...provided.droppableProps}
        >
          huhuhu
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

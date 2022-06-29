import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './index.css';

const getItems = (count) =>
  Array.from({ length: count }, (v, k) => k).map((k) => ({
    id: `item-${k}`,
    content: `item ${k}`
  }));

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const grid = 8;
const getListStyle = (isDraggingOver) => ({
  background: isDraggingOver ? 'lightblue' : 'lightgrey',
  padding: grid,
  width: 250
});

export default function DropAble() {
  const [items, setItems] = useState(getItems(5));

  function onDragEnd(result) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }
    const recorderItems = reorder(
      items,
      result.source.index,
      result.destination.index
    );

    setItems(recorderItems);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="droppable-header">
        <div>标签</div>
        <div>operations</div>
      </div>
      <Droppable droppableId="all-droppables">
        {(provided, snapshot) => (
          <div
            className="droppable-wrap"
            {...provided.droppableProps}
            ref={provided.innerRef}
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    className="draggable-item"
                    {...provided.draggableProps}
                    ref={provided.innerRef}
                  >
                    <div>
                      {item.content} {item.id}
                    </div>
                    <div>
                      first
                      <div {...provided.dragHandleProps}>drag1</div>
                      end
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
